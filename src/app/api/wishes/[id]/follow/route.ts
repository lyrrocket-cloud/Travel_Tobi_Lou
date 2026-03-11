import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { followerName } = body;

    if (!followerName) {
      return NextResponse.json(
        { error: 'Missing follower name' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 检查是否已经跟随过
    const { data: existingFollow } = await client
      .from('wish_followers')
      .select('*')
      .eq('wish_id', parseInt(id))
      .eq('follower_name', followerName)
      .single();

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already followed this wish' },
        { status: 400 }
      );
    }

    // 添加跟随记录
    const { error: followError } = await client
      .from('wish_followers')
      .insert({
        wish_id: parseInt(id),
        follower_name: followerName,
      });

    if (followError) {
      return NextResponse.json({ error: followError.message }, { status: 500 });
    }

    // 更新愿望的跟随人数
    const { data: wish, error: wishError } = await client
      .from('wishes')
      .select('followers_count')
      .eq('id', parseInt(id))
      .single();

    if (wishError) {
      return NextResponse.json({ error: wishError.message }, { status: 500 });
    }

    const { error: updateError } = await client
      .from('wishes')
      .update({
        followers_count: (wish?.followers_count || 0) + 1,
      })
      .eq('id', parseInt(id));

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error following wish:', error);
    return NextResponse.json({ error: 'Failed to follow wish' }, { status: 500 });
  }
}
