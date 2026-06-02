import { NextRequest, NextResponse } from 'next/server';
import { DefaultTripDB } from '@/lib/database';

// GET - 获取默认旅行ID
export async function GET() {
  try {
    const wishId = await DefaultTripDB.get();
    return NextResponse.json({ wishId });
  } catch (error) {
    console.error('[Default Trip] Error in GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default trip', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 设置默认旅行ID
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wishId } = body;
    
    if (!wishId) {
      return NextResponse.json(
        { error: 'Missing wishId' },
        { status: 400 }
      );
    }
    
    await DefaultTripDB.set(wishId);
    return NextResponse.json({ success: true, wishId });
  } catch (error) {
    console.error('[Default Trip] Error in PUT:', error);
    return NextResponse.json(
      { error: 'Failed to set default trip', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 清除默认旅行设置
export async function DELETE() {
  try {
    await DefaultTripDB.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Default Trip] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to clear default trip', details: String(error) },
      { status: 500 }
    );
  }
}