import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    
    // 按创建时间降序和跟随人数降序排序
    const { data, error } = await client
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false })
      .order('followers_count', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wishes: data });
  } catch (error) {
    console.error('Error fetching wishes:', error);
    return NextResponse.json({ error: 'Failed to fetch wishes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, travelMonth, wisherName } = body;

    if (!destination || !travelMonth || !wisherName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('wishes')
      .insert({
        destination,
        travel_month: travelMonth,
        wisher_name: wisherName,
        followers_count: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (error) {
    console.error('Error creating wish:', error);
    return NextResponse.json({ error: 'Failed to create wish' }, { status: 500 });
  }
}
