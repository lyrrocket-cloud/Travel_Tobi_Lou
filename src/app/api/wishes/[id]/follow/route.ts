import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { readJsonFile, writeJsonFile, DATA_FILES } from '@/lib/storage';

// 保存数据到文件
function saveToFile(wishes: any[], followers: any[]) {
  writeJsonFile(DATA_FILES.WISHES, wishes);
  writeJsonFile(DATA_FILES.FOLLOWERS, followers);
}

// 从文件加载数据
let inMemoryWishes: any[] = readJsonFile(DATA_FILES.WISHES, []);
let inMemoryFollowers: any[] = readJsonFile(DATA_FILES.FOLLOWERS, []);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API Follow] POST request received');
  
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[API Follow] Request body:', body);
    
    const { followerName } = body;

    if (!followerName) {
      return NextResponse.json(
        { error: 'Missing follower name' },
        { status: 400 }
      );
    }

    let usingInMemory = false;
    
    try {
      const client = getSupabaseClient();
      
      const { data: existingFollows } = await client
        .from('wish_followers')
        .select('*')
        .eq('wish_id', id)
        .eq('follower_name', followerName);

      if (existingFollows && existingFollows.length > 0) {
        return NextResponse.json(
          { error: 'Already followed this wish' },
          { status: 400 }
        );
      }

      const { error: followError } = await client
        .from('wish_followers')
        .insert({
          wish_id: id,
          follower_name: followerName,
        });

      if (followError) {
        console.warn('[API Follow] Supabase follow failed, falling back:', followError);
        throw followError;
      }

      const { data: wish, error: wishError } = await client
        .from('wishes')
        .select('followers_count')
        .eq('id', id);

      if (wishError || !wish || wish.length === 0) {
        console.warn('[API Follow] Wish not found in Supabase');
      } else {
        const currentCount = wish[0]?.followers_count || 0;
        await client
          .from('wishes')
          .update({
            followers_count: currentCount + 1,
          })
          .eq('id', id);
      }

      return NextResponse.json({ success: true });
      
    } catch (supabaseError) {
      console.warn('[API Follow] Using in-memory for follow');
      usingInMemory = true;
      
      const existingFollow = inMemoryFollowers.find(
        f => f.wish_id === id && f.follower_name === followerName
      );
      
      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already followed this wish' },
          { status: 400 }
        );
      }
      
      inMemoryFollowers.push({
        wish_id: id,
        follower_name: followerName
      });
      
      const wishIndex = inMemoryWishes.findIndex(w => w.id === id);
      if (wishIndex !== -1) {
        inMemoryWishes[wishIndex].followers_count = 
          (inMemoryWishes[wishIndex].followers_count || 0) + 1;
      }
      
      saveToFile(inMemoryWishes, inMemoryFollowers); // 保存到文件
      return NextResponse.json({ success: true, usingInMemory });
    }
    
  } catch (error) {
    console.error('[API Follow] Error in POST:', error);
    return NextResponse.json({ error: 'Failed to follow wish', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API Follow] DELETE request received');
  
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[API Follow] Request body:', body);
    
    const { followerName } = body;

    if (!followerName) {
      return NextResponse.json(
        { error: 'Missing follower name' },
        { status: 400 }
      );
    }

    let usingInMemory = false;
    
    try {
      const client = getSupabaseClient();
      
      const { error: deleteError } = await client
        .from('wish_followers')
        .delete()
        .eq('wish_id', id)
        .eq('follower_name', followerName);

      if (deleteError) {
        console.warn('[API Follow] Supabase unfollow failed, falling back:', deleteError);
        throw deleteError;
      }

      const { data: wish, error: wishError } = await client
        .from('wishes')
        .select('followers_count')
        .eq('id', id);

      if (!wishError && wish && wish.length > 0) {
        const currentCount = wish[0]?.followers_count || 0;
        await client
          .from('wishes')
          .update({
            followers_count: Math.max(0, currentCount - 1),
          })
          .eq('id', id);
      }

      return NextResponse.json({ success: true });
      
    } catch (supabaseError) {
      console.warn('[API Follow] Using in-memory for unfollow');
      usingInMemory = true;
      
      const initialLength = inMemoryFollowers.length;
      inMemoryFollowers = inMemoryFollowers.filter(
        f => !(f.wish_id === id && f.follower_name === followerName)
      );
      
      if (inMemoryFollowers.length < initialLength) {
        const wishIndex = inMemoryWishes.findIndex(w => w.id === id);
        if (wishIndex !== -1) {
          inMemoryWishes[wishIndex].followers_count = 
            Math.max(0, (inMemoryWishes[wishIndex].followers_count || 0) - 1);
        }
        
        saveToFile(inMemoryWishes, inMemoryFollowers); // 保存到文件
        return NextResponse.json({ success: true, usingInMemory });
      }
      
      return NextResponse.json({ error: 'Follower not found' }, { status: 404 });
    }
    
  } catch (error) {
    console.error('[API Follow] Error in DELETE:', error);
    return NextResponse.json({ error: 'Failed to unfollow wish', details: String(error) }, { status: 500 });
  }
}
