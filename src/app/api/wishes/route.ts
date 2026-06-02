import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    
    const { data: wishesData, error: wishesError } = await client
      .from('wishes')
      .select('*');
    
    if (wishesError) {
      throw wishesError;
    }
    
    const { data: followersData, error: followersError } = await client
      .from('wish_followers')
      .select('wish_id, follower_name');
    
    if (followersError) {
      console.warn('[API Wishes] Followers query failed:', followersError);
    }
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const monthMap: Record<string, number> = {
      '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6,
      '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11, '十二月': 12
    };
    
    const wishes = wishesData.map(wish => {
      let isExpired = false;
      
      if (wish.is_confirmed === 1 && wish.confirmed_date) {
        const confirmedDate = new Date(wish.confirmed_date);
        confirmedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isExpired = confirmedDate < today;
      } else {
        const targetYear = wish.travel_year || currentYear;
        const targetMonth = monthMap[wish.travel_month] || 0;
        
        if (targetMonth !== 0) {
          if (currentYear > targetYear) {
            isExpired = true;
          } else if (currentYear === targetYear && currentMonth > targetMonth) {
            isExpired = true;
          }
        }
      }
      
      return {
        ...wish,
        followers: followersData
          ?.filter(f => f.wish_id === wish.id)
          .map(f => f.follower_name) || [],
        is_expired: isExpired ? 1 : 0
      };
    });
    
    wishes.sort((a, b) => {
      if (a.is_expired !== b.is_expired) {
        return a.is_expired - b.is_expired;
      }
      if (a.is_confirmed === 1 && b.is_confirmed === 1) {
        const dateA = new Date(a.confirmed_date || '').getTime();
        const dateB = new Date(b.confirmed_date || '').getTime();
        return dateA - dateB;
      }
      if (a.is_confirmed !== b.is_confirmed) {
        return b.is_confirmed - a.is_confirmed;
      }
      return b.followers_count - a.followers_count;
    });
    
    return NextResponse.json({ wishes });
    
  } catch (error) {
    console.error('[API Wishes] Error in GET:', error);
    return NextResponse.json({ error: 'Failed to fetch wishes', details: String(error) }, { status: 500 });
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
      throw error;
    }
    
    return NextResponse.json({ wish: data });
    
  } catch (error) {
    console.error('[API Wishes] Error in POST:', error);
    return NextResponse.json({ error: 'Failed to create wish', details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { id, destination, travelYear, travelMonth, wisherName, isConfirmed, confirmedDate, travelers } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing wish ID' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    const updateData: any = {};
    if (destination !== undefined) updateData.destination = destination;
    if (travelYear !== undefined) updateData.travel_year = travelYear;
    if (travelMonth !== undefined) updateData.travel_month = travelMonth;
    if (wisherName !== undefined) updateData.wisher_name = wisherName;
    if (isConfirmed !== undefined) updateData.is_confirmed = isConfirmed;
    if (confirmedDate !== undefined) updateData.confirmed_date = confirmedDate;
    if (travelers !== undefined) updateData.travelers = travelers;
    
    const { data, error } = await client
      .from('wishes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ wish: data });
    
  } catch (error) {
    console.error('[API Wishes] Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to update wish', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing wish ID' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    await client
      .from('wish_followers')
      .delete()
      .eq('wish_id', id);
    
    const { error } = await client
      .from('wishes')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API Wishes] Error in DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete wish', details: String(error) }, { status: 500 });
  }
}