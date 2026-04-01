import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { confirmedDate, travelers } = body;

    if (!confirmedDate || !travelers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('wishes')
      .update({
        is_confirmed: 1,
        confirmed_date: confirmedDate,
        travelers: travelers,
        is_pinned: 1,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (error) {
    console.error('Error confirming wish:', error);
    return NextResponse.json({ error: 'Failed to confirm wish' }, { status: 500 });
  }
}

// 更新已成行旅行的出发日期和出行人
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { confirmedDate, travelers } = body;

    if (!confirmedDate || !travelers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('wishes')
      .update({
        confirmed_date: confirmedDate,
        travelers: travelers,
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (error) {
    console.error('Error updating confirmed trip:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}
