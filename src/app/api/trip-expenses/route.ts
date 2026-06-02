import { NextRequest, NextResponse } from 'next/server';
import { TripExpenseDB } from '@/lib/database';

// GET - 获取所有账单记录或根据wishId获取
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wishId = searchParams.get('wishId');
    
    let tripExpenses;
    if (wishId) {
      const record = await TripExpenseDB.getByWishId(wishId);
      tripExpenses = record ? [record] : [];
    } else {
      tripExpenses = await TripExpenseDB.getAll();
    }
    
    return NextResponse.json({ tripExpenses });
  } catch (error) {
    console.error('[Trip Expenses] Error in GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip expenses', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建新的账单记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wishId, destination, startDate, endDate } = body;
    
    if (!wishId || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 检查是否已存在该愿望的账单记录
    const existingRecord = await TripExpenseDB.getByWishId(wishId);
    if (existingRecord) {
      return NextResponse.json(
        { error: 'Trip expense record already exists for this wish' },
        { status: 400 }
      );
    }
    
    // 创建新的账单记录
    const newRecord = await TripExpenseDB.create({
      id: `trip-expense-${Date.now()}`,
      wishId,
      destination,
      startDate,
      endDate,
      expenses: [],
    });
    
    return NextResponse.json({ tripExpense: newRecord });
  } catch (error) {
    console.error('[Trip Expenses] Error in POST:', error);
    return NextResponse.json(
      { error: 'Failed to create trip expense', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新账单记录或添加/更新支出
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing trip expense record id' },
        { status: 400 }
      );
    }
    
    const updatedRecord = await TripExpenseDB.update(id, updateData);
    
    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'Trip expense record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ tripExpense: updatedRecord });
  } catch (error) {
    console.error('[Trip Expenses] Error in PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update trip expense', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除账单记录
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing trip expense record id' },
        { status: 400 }
      );
    }
    
    await TripExpenseDB.delete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Trip Expenses] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete trip expense', details: String(error) },
      { status: 500 }
    );
  }
}