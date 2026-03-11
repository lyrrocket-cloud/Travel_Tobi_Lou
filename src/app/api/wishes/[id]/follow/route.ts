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
    const { data: existingFollows } = await client
      .from('wish_followers')
      .select('*')
      .eq('wish_id', parseInt(id))
      .eq('follower_name', followerName);

    if (existingFollows && existingFollows.length > 0) {
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
      console.error('Error inserting follower:', followError);
      return NextResponse.json({ error: followError.message }, { status: 500 });
    }

    // 获取当前跟随人数
    const { data: wish, error: wishError } = await client
      .from('wishes')
      .select('followers_count')
      .eq('id', parseInt(id));

    if (wishError || !wish || wish.length === 0) {
      console.error('Error fetching wish:', wishError);
      return NextResponse.json({ error: 'Wish not found' }, { status: 404 });
    }

    // 更新跟随人数
    const currentCount = wish[0]?.followers_count || 0;
    const { error: updateError } = await client
      .from('wishes')
      .update({
        followers_count: currentCount + 1,
      })
      .eq('id', parseInt(id));

    if (updateError) {
      console.error('Error updating followers count:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error following wish:', error);
    return NextResponse.json({ error: 'Failed to follow wish' }, { status: 500 });
  }
}
