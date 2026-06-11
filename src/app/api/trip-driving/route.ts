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
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    await client.from('trip_driving_records').select('id').limit(1);
    return true;
  } catch (error) {
    return false;
  }
}

// 获取所有驾驶记录
export async function GET() {
  initializeData();
  
  try {
    const dbAvailable = await isDatabaseAvailable();
    
    if (dbAvailable) {
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

        return NextResponse.json({ tripDrivingRecords });
      } catch (error) {
        console.error('[API] Error fetching from database:', error);
      }
    }
    
    // Fallback to file storage
    console.log('[Trip Driving API] Using file storage');
    return NextResponse.json({ tripDrivingRecords: inMemoryDrivingRecords });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ tripDrivingRecords: inMemoryDrivingRecords });
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

    const dbAvailable = await isDatabaseAvailable();
    
    if (dbAvailable) {
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
      }
    }
    
    // Fallback to file storage
    console.log('[Trip Driving API] Using file storage for creation');
    
    // 检查是否已存在
    const existing = inMemoryDrivingRecords.find(r => String(r.wishId) === String(wishId));
    if (existing) {
      return NextResponse.json({ error: 'Driving record already exists for this wish' }, { status: 400 });
    }

    const newRecord = {
      id: `driving-${Date.now()}`,
      wishId: String(wishId),
      destination: destination || '',
      startDate: startDate || null,
      records: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryDrivingRecords.push(newRecord);
    saveDrivingRecords();

    return NextResponse.json(newRecord);
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

    const dbAvailable = await isDatabaseAvailable();
    
    if (dbAvailable) {
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
      }
    }
    
    // Fallback to file storage
    console.log('[Trip Driving API] Using file storage for update');
    
    const index = inMemoryDrivingRecords.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    inMemoryDrivingRecords[index] = {
      ...inMemoryDrivingRecords[index],
      records: records || [],
      updatedAt: new Date().toISOString(),
    };
    saveDrivingRecords();

    return NextResponse.json(inMemoryDrivingRecords[index]);
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
