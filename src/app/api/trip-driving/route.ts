import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, DATA_FILES, getDataDir } from '@/lib/storage';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Pool } from 'pg';

// 内存中存储
let inMemoryDrivingRecords: any[] = [];
let isInitialized = false;
let tableCreated = false; // 标记表是否已创建

// 初始化数据
function initializeData() {
  if (!isInitialized) {
    inMemoryDrivingRecords = readJsonFile(DATA_FILES.TRIP_DRIVING, []);
    isInitialized = true;
    console.log('[Trip Driving API] Loaded data from file:', inMemoryDrivingRecords.length, 'records');
  }
}

// 保存驾驶记录到文件
function saveDrivingRecords() {
  const success = writeJsonFile(DATA_FILES.TRIP_DRIVING, inMemoryDrivingRecords);
  if (success) {
    console.log('[Trip Driving API] Saved driving records to file:', getDataDir());
  }
  return success;
}

// 创建 trip_driving_records 表的 SQL
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS trip_driving_records (
  id VARCHAR(100) PRIMARY KEY NOT NULL,
  wish_id VARCHAR(100) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date VARCHAR(20),
  records JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS trip_driving_records_wish_id_idx ON trip_driving_records(wish_id);
`;

// 使用 PostgreSQL 直接连接创建表
async function createTableIfNotExists(): Promise<{ success: boolean; error?: string }> {
  if (tableCreated) {
    return { success: true };
  }
  
  const dbUrl = process.env.PGDATABASE_URL;
  if (!dbUrl) {
    console.error('[Trip Driving API] PGDATABASE_URL not set');
    return { success: false, error: 'PGDATABASE_URL not set' };
  }
  
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    console.log('[Trip Driving API] Creating trip_driving_records table if not exists...');
    await pool.query(CREATE_TABLE_SQL);
    console.log('[Trip Driving API] Table trip_driving_records created/verified successfully');
    tableCreated = true;
    return { success: true };
  } catch (error: any) {
    console.error('[Trip Driving API] Error creating table:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  } finally {
    await pool.end();
  }
}

// 检查数据库是否可用，如果表不存在则尝试创建
async function ensureDatabaseReady(): Promise<{ available: boolean; error?: string; hint?: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { 
        available: false, 
        error: 'Supabase client is null. Check COZE_SUPABASE_URL and COZE_SUPABASE_ANON_KEY environment variables.' 
      };
    }
    
    // 尝试查询表，检查是否存在
    const { error } = await client.from('trip_driving_records').select('id').limit(1);
    
    if (error) {
      // 表不存在的错误
      if (error.message?.includes('Could not find the table') || error.code === 'PGRST205') {
        console.log('[Trip Driving API] Table trip_driving_records does not exist, attempting to create via PostgreSQL...');
        
        // 使用 PostgreSQL 直接连接创建表
        const result = await createTableIfNotExists();
        
        if (result.success) {
          console.log('[Trip Driving API] Table created successfully, verifying...');
          // 再次验证
          const { error: verifyError } = await client.from('trip_driving_records').select('id').limit(1);
          if (!verifyError) {
            return { available: true };
          }
        }
        
        return { 
          available: false, 
          error: 'Failed to create table: ' + (result.error || 'Unknown error'),
          hint: 'Please check the database connection and permissions.'
        };
      }
      
      console.error('[Trip Driving API] Database error:', error);
      return { available: false, error: error.message, hint: error.hint };
    }
    
    console.log('[Trip Driving API] Database connection verified');
    return { available: true };
  } catch (error: any) {
    console.error('[Trip Driving API] Database connection failed:', error);
    return { available: false, error: error?.message || 'Unknown error' };
  }
}

// 简化的数据库可用性检查（用于只读操作）
async function isDatabaseAvailable(): Promise<{ available: boolean; error?: string; hint?: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { 
        available: false, 
        error: 'Supabase client is null. Check COZE_SUPABASE_URL and COZE_SUPABASE_ANON_KEY environment variables.' 
      };
    }
    await client.from('trip_driving_records').select('id').limit(1);
    console.log('[Trip Driving API] Database connection verified');
    return { available: true };
  } catch (error: any) {
    console.error('[Trip Driving API] Database connection failed:', error);
    
    // 检查是否是表不存在的错误
    if (error?.message?.includes('Could not find the table') || error?.code === 'PGRST205') {
      return { 
        available: false, 
        error: 'Table trip_driving_records does not exist in Supabase database.',
        hint: 'Please execute the migration SQL in Supabase SQL Editor to create the table. Check supabase/migrations/create_trip_tables.sql for the SQL script.'
      };
    }
    
    return { available: false, error: error?.message || 'Unknown error' };
  }
}

// 获取所有驾驶记录
export async function GET() {
  initializeData();
  
  try {
    // 使用 ensureDatabaseReady 来自动创建表（如果不存在）
    const dbResult = await ensureDatabaseReady();
    
    if (dbResult.available) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('trip_driving_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const tripDrivingRecords = data.map((record: any) => ({
          id: record.id,
          wishId: record.wish_id,
          destination: record.destination,
          startDate: record.start_date,
          records: record.records || [],
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        }));

        console.log('[Trip Driving API] Fetched', tripDrivingRecords.length, 'records from database');
        return NextResponse.json({ tripDrivingRecords });
      } catch (error) {
        console.error('[API] Error fetching from database:', error);
        return NextResponse.json({ error: 'Failed to fetch from database', details: String(error) }, { status: 500 });
      }
    }
    
    // 数据库不可用时返回详细错误信息
    console.error('[Trip Driving API] Database not available:', dbResult.error);
    return NextResponse.json({ 
      error: 'Database not available', 
      details: dbResult.error,
      hint: dbResult.hint 
    }, { status: 503 });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 创建新的驾驶记录
export async function POST(request: NextRequest) {
  initializeData();
  
  try {
    const body = await request.json();
    const { wishId, destination, startDate } = body;

    if (!wishId) {
      return NextResponse.json({ error: 'Wish ID is required' }, { status: 400 });
    }

    // 使用 ensureDatabaseReady 来自动创建表（如果不存在）
    const dbResult = await ensureDatabaseReady();
    
    if (dbResult.available) {
      try {
        // 检查是否已存在记录
        const client = getSupabaseClient();
        const { data: existing } = await client
          .from('trip_driving_records')
          .select('id')
          .eq('wish_id', wishId)
          .single();

        if (existing) {
          return NextResponse.json({ error: 'Driving record already exists for this wish' }, { status: 400 });
        }

        const { data, error } = await client
          .from('trip_driving_records')
          .insert({
            wish_id: wishId,
            destination: destination || '',
            start_date: startDate || null,
            records: [],
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Trip Driving API] Created record in database:', data.id);
        return NextResponse.json({
          id: data.id,
          wishId: data.wish_id,
          destination: data.destination,
          startDate: data.start_date,
          records: data.records || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } catch (error) {
        console.error('[API] Error saving to database:', error);
        return NextResponse.json({ error: 'Failed to save to database', details: String(error) }, { status: 500 });
      }
    }
    
    // 数据库不可用时返回详细错误信息
    console.error('[Trip Driving API] Database not available:', dbResult.error);
    return NextResponse.json({ 
      error: 'Database not available', 
      details: dbResult.error,
      hint: dbResult.hint 
    }, { status: 503 });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 更新驾驶记录
export async function PUT(request: NextRequest) {
  initializeData();
  
  try {
    const body = await request.json();
    const { id, records } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 使用 ensureDatabaseReady 来自动创建表（如果不存在）
    const dbResult = await ensureDatabaseReady();
    
    if (dbResult.available) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('trip_driving_records')
          .update({
            records: records || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        console.log('[Trip Driving API] Updated record in database:', data.id);
        return NextResponse.json({
          id: data.id,
          wishId: data.wish_id,
          destination: data.destination,
          startDate: data.start_date,
          records: data.records || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } catch (error) {
        console.error('[API] Error updating in database:', error);
        return NextResponse.json({ error: 'Failed to update in database', details: String(error) }, { status: 500 });
      }
    }
    
    // 数据库不可用时返回详细错误信息
    console.error('[Trip Driving API] Database not available:', dbResult.error);
    return NextResponse.json({ 
      error: 'Database not available', 
      details: dbResult.error,
      hint: dbResult.hint 
    }, { status: 503 });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
