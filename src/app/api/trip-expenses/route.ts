import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, DATA_FILES } from '@/lib/storage';
import { TripExpenseRecord, ExpenseItem, ExpenseCategory } from '@/types';

// 从文件读取数据
function readFromFile(): TripExpenseRecord[] {
  return readJsonFile<TripExpenseRecord[]>(DATA_FILES.TRIP_EXPENSES, []);
}

// 写入数据到文件
function writeToFile(data: TripExpenseRecord[]) {
  writeJsonFile(DATA_FILES.TRIP_EXPENSES, data);
}

// GET - 获取所有账单记录或根据wishId获取
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wishId = searchParams.get('wishId');
    
    let tripExpenses = readFromFile();
    
    if (wishId) {
      tripExpenses = tripExpenses.filter(record => record.wishId === wishId);
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
    
    const tripExpenses = readFromFile();
    
    // 检查是否已存在该愿望的账单记录
    const existingRecord = tripExpenses.find(record => record.wishId === wishId);
    if (existingRecord) {
      return NextResponse.json(
        { error: 'Trip expense record already exists for this wish' },
        { status: 400 }
      );
    }
    
    // 创建新的账单记录
    const newRecord: TripExpenseRecord = {
      id: `trip-expense-${Date.now()}`,
      wishId,
      destination,
      startDate,
      endDate,
      expenses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tripExpenses.push(newRecord);
    writeToFile(tripExpenses);
    
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
    
    const tripExpenses = readFromFile();
    const recordIndex = tripExpenses.findIndex(record => record.id === id);
    
    if (recordIndex === -1) {
      return NextResponse.json(
        { error: 'Trip expense record not found' },
        { status: 404 }
      );
    }
    
    tripExpenses[recordIndex] = {
      ...tripExpenses[recordIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    writeToFile(tripExpenses);
    
    return NextResponse.json({ tripExpense: tripExpenses[recordIndex] });
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
    
    const tripExpenses = readFromFile();
    const filteredExpenses = tripExpenses.filter(record => record.id !== id);
    
    writeToFile(filteredExpenses);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Trip Expenses] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete trip expense', details: String(error) },
      { status: 500 }
    );
  }
}