import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      .update({
        destination,
        travel_month: travelMonth,
        wisher_name: wisherName,
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (error) {
    console.error('Error updating wish:', error);
    return NextResponse.json({ error: 'Failed to update wish' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 先删除相关的跟随记录
    const { error: followError } = await client
      .from('wish_followers')
      .delete()
      .eq('wish_id', parseInt(id));

    if (followError) {
      console.error('Error deleting wish followers:', followError);
    }

    // 再删除愿望
    const { error: wishError } = await client
      .from('wishes')
      .delete()
      .eq('id', parseInt(id));

    if (wishError) {
      return NextResponse.json({ error: wishError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wish:', error);
    return NextResponse.json({ error: 'Failed to delete wish' }, { status: 500 });
  }
}
