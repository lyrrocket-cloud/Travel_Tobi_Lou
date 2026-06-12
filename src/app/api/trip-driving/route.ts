import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, DATA_FILES, getDataDir } from '@/lib/storage';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 内存中存储
let inMemoryDrivingRecords: any[] = [];
let isInitialized = false;

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

// 检查数据库是否可用
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
    const dbResult = await isDatabaseAvailable();
    
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

    const dbResult = await isDatabaseAvailable();
    
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

    const dbResult = await isDatabaseAvailable();
    
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
