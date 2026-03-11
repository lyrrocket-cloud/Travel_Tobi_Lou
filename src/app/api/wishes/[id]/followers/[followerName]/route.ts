import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; followerName: string }> }
) {
  try {
    const { id, followerName } = await params;
    const client = getSupabaseClient();

    // 删除跟随记录
    const { error: deleteError } = await client
      .from('wish_followers')
      .delete()
      .eq('wish_id', parseInt(id))
      .eq('follower_name', decodeURIComponent(followerName));

    if (deleteError) {
      console.error('Error deleting follower:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 获取当前跟随人数
    const { data: wish, error: wishError } = await client
      .from('wishes')
      .select('followers_count')
      .eq('id', parseInt(id));

    if (wishError || !wish || wish.length === 0) {
      return NextResponse.json({ error: 'Wish not found' }, { status: 404 });
    }

    // 更新跟随人数（减1，但不小于0）
    const currentCount = wish[0]?.followers_count || 0;
    const { error: updateError } = await client
      .from('wishes')
      .update({
        followers_count: Math.max(0, currentCount - 1),
      })
      .eq('id', parseInt(id));

    if (updateError) {
      console.error('Error updating followers count:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting follower:', error);
    return NextResponse.json({ error: 'Failed to delete follower' }, { status: 500 });
  }
}
