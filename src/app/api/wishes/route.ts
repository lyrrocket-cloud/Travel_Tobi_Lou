import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    
    // 获取所有愿望
    const { data: wishes, error: wishesError } = await client
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false })
      .order('followers_count', { ascending: false });

    if (wishesError) {
      return NextResponse.json({ error: wishesError.message }, { status: 500 });
    }

    // 获取所有跟随记录
    const { data: followers, error: followersError } = await client
      .from('wish_followers')
      .select('wish_id, follower_name');

    if (followersError) {
      return NextResponse.json({ error: followersError.message }, { status: 500 });
    }

    // 组装数据，为每个愿望添加跟随人列表
    const wishesWithFollowers = wishes.map((wish) => ({
      ...wish,
      followers: followers
        ?.filter((f) => f.wish_id === wish.id)
        .map((f) => f.follower_name) || [],
    }));

    return NextResponse.json({ wishes: wishesWithFollowers });
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
