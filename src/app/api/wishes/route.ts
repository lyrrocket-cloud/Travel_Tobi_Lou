import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    
    // 获取所有愿望
    const { data: wishes, error: wishesError } = await client
      .from('wishes')
      .select('*');

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

    // 月份映射
    const monthMap: Record<string, number> = {
      '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6,
      '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11, '十二月': 12
    };

    // 获取当前月份
    const currentMonth = new Date().getMonth() + 1;

    // 计算月份距离当前月份的差距
    const getMonthDistance = (month: string) => {
      const targetMonth = monthMap[month] || 0;
      if (targetMonth >= currentMonth) {
        return targetMonth - currentMonth;
      }
      return targetMonth + 12 - currentMonth;
    };

    // 组装数据，为每个愿望添加跟随人列表
    const wishesWithFollowers = wishes.map((wish) => ({
      ...wish,
      followers: followers
        ?.filter((f) => f.wish_id === wish.id)
        .map((f) => f.follower_name) || [],
    }));

    // 排序：先按出发月份距离当前月份升序（最近的在前），再按跟随人数降序
    wishesWithFollowers.sort((a, b) => {
      const distanceA = getMonthDistance(a.travel_month);
      const distanceB = getMonthDistance(b.travel_month);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }
      return b.followers_count - a.followers_count;
    });

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
