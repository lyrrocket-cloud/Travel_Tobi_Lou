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

    // 获取当前时间
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 判断是否已过期
    // 逻辑：
    // 1. 已成行：如果出发日期已过，则过期
    // 2. 未成行：根据期望年月判断是否已过期
    const isExpired = (wish: { travel_year?: number; travel_month: string; is_confirmed: number; confirmed_date?: string }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 只比较日期，忽略时间
      
      // 已成行：判断出发日期是否已过
      if (wish.is_confirmed === 1 && wish.confirmed_date) {
        const tripDate = new Date(wish.confirmed_date);
        tripDate.setHours(0, 0, 0, 0);
        return tripDate < today;
      }
      
      // 未成行：根据期望年月判断
      const targetYear = wish.travel_year || currentYear;
      const targetMonth = monthMap[wish.travel_month] || 0;
      if (targetMonth === 0) return false;
      
      // 判断是否过期：当前年份 > 期望年份，或当前年份 = 期望年份且当前月份 > 期望月份
      if (currentYear > targetYear) return true;
      if (currentYear === targetYear && currentMonth > targetMonth) return true;
      
      return false;
    };

    // 计算期望年月距离当前年月的差距（用于排序）
    const getYearMonthDistance = (travelYear: number | undefined, travelMonth: string) => {
      const targetYear = travelYear || currentYear;
      const targetMonth = monthMap[travelMonth] || 0;
      
      // 计算月份差距
      return (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
    };

    // 组装数据，为每个愿望添加跟随人列表和过期状态
    const wishesWithFollowers = wishes.map((wish) => ({
      ...wish,
      followers: followers
        ?.filter((f) => f.wish_id === wish.id)
        .map((f) => f.follower_name) || [],
      is_expired: isExpired(wish) ? 1 : 0,
    }));

    // 排序规则：
    // 1. 已过期的排在最后
    // 2. 已成行的按出发日期最近排序
    // 3. 其它的按距离期望年月和跟随人数排序
    wishesWithFollowers.sort((a, b) => {
      // 已过期的排在最后
      if (a.is_expired !== b.is_expired) {
        return a.is_expired - b.is_expired;
      }

      // 已成行的愿望按出发日期排序
      if (a.is_confirmed === 1 && b.is_confirmed === 1) {
        const dateA = new Date(a.confirmed_date || '').getTime();
        const dateB = new Date(b.confirmed_date || '').getTime();
        return dateA - dateB;
      }

      // 一个已成行一个未成行，已成行的在前
      if (a.is_confirmed !== b.is_confirmed) {
        return b.is_confirmed - a.is_confirmed;
      }

      // 都未成行，按距离期望年月和跟随人数排序
      const distanceA = getYearMonthDistance(a.travel_year, a.travel_month);
      const distanceB = getYearMonthDistance(b.travel_year, b.travel_month);
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
    const { destination, travelYear, travelMonth, wisherName } = body;

    if (!destination || !travelYear || !travelMonth || !wisherName) {
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
        travel_year: travelYear,
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
