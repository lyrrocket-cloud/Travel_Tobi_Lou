import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 获取所有驾驶记录
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('trip_driving_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching trip driving records:', error);
      return NextResponse.json({ error: 'Failed to fetch driving records' }, { status: 500 });
    }

    const tripDrivingRecords = data.map(record => ({
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
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 创建新的驾驶记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wishId, destination, startDate } = body;

    if (!wishId) {
      return NextResponse.json({ error: 'Wish ID is required' }, { status: 400 });
    }

    // 检查是否已存在记录
    const { data: existing } = await supabase
      .from('trip_driving_records')
      .select('id')
      .eq('wish_id', wishId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Driving record already exists for this wish' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('trip_driving_records')
      .insert({
        wish_id: wishId,
        destination: destination || '',
        start_date: startDate || null,
        records: [],
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating driving record:', error);
      return NextResponse.json({ error: 'Failed to create driving record' }, { status: 500 });
    }

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
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 更新驾驶记录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, records } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('trip_driving_records')
      .update({
        records: records || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating driving record:', error);
      return NextResponse.json({ error: 'Failed to update driving record' }, { status: 500 });
    }

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
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
