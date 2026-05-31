import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 活动项接口
interface ActivityItem {
  id: string;
  type: string; // 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'accommodation' | 'other'
  startTime: string;
  endTime?: string;
  content?: string;
  location?: string;
  notes?: string;
}

// 交通信息接口
interface TransportInfo {
  id: string;
  type: string; // 'flight' | 'train' | 'bus' | 'taxi' | 'walk' | 'other'
  from: string;
  to: string;
  departureTime?: string;
  arrivalTime?: string;
  details?: string;
  position: 'arrival' | 'departure' | 'between';
  beforeActivityId?: string;
  afterActivityId?: string;
}

// 单日旅行计划接口
interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  activities: ActivityItem[];
  transport: TransportInfo[];
}

// 旅行规划接口
interface TripPlan {
  id: string;
  wishId: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  travelDays: number;
  travelers: string;
  days: DayPlan[];
  createdAt: string;
  updatedAt: string;
}

// 本地文件存储路径
const DATA_FILE = path.join(process.cwd(), 'data', 'trip-plans.json');

// 确保数据目录存在
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 数据迁移函数：将旧数据结构转换为新结构
function migrateTripPlan(plan: any): TripPlan {
  // 确保days存在
  if (!plan.days) {
    plan.days = [];
  }

  // 对每个day进行迁移
  plan.days = plan.days.map((day: any) => {
    // 如果有items但没有activities，进行迁移
    if (day.items && !day.activities) {
      console.log('[Trip Plan] Migrating items to activities for day', day.dayNumber);
      day.activities = day.items
        .filter((item: any) => item.content && item.content.trim())
        .map((item: any) => ({
          id: item.id,
          type: item.time, // 原来的time字段用作type
          startTime: '09:00', // 默认时间
          endTime: '10:00',
          content: item.content,
          location: item.location,
          notes: item.notes
        }));
      delete day.items; // 删除旧字段
    } else if (!day.activities) {
      day.activities = [];
    }

    // 确保transport存在
    if (!day.transport) {
      day.transport = [];
    }

    return day;
  });

  return plan as TripPlan;
}

// 从文件读取数据
function readFromFile(): TripPlan[] {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const plans = JSON.parse(data);
      // 对每个计划进行迁移
      return plans.map(migrateTripPlan);
    }
  } catch (error) {
    console.error('[Trip Plan] Error reading file:', error);
  }
  return [];
}

// 写入数据到文件
function writeToFile(data: TripPlan[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Trip Plan] Error writing file:', error);
  }
}

// 初始化空的DayPlan
function createEmptyDayPlan(dayNumber: number): DayPlan {
  return {
    id: `day-${dayNumber}-${Date.now()}`,
    dayNumber,
    activities: [],
    transport: [],
  };
}

// GET - 获取所有旅行规划或根据wishId获取
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wishId = searchParams.get('wishId');
    
    let tripPlans = readFromFile();
    
    if (wishId) {
      tripPlans = tripPlans.filter(plan => plan.wishId === wishId);
    }
    
    return NextResponse.json({ tripPlans });
  } catch (error) {
    console.error('[Trip Plan] Error in GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip plans', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建新的旅行规划
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wishId, destination, startDate, endDate, travelDays, travelers } = body;
    
    if (!wishId || !destination || !travelDays || !travelers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const tripPlans = readFromFile();
    
    // 检查是否已存在该愿望的旅行规划
    const existingPlan = tripPlans.find(plan => plan.wishId === wishId);
    if (existingPlan) {
      return NextResponse.json(
        { error: 'Trip plan already exists for this wish' },
        { status: 400 }
      );
    }
    
    // 创建新的旅行规划
    const newTripPlan: TripPlan = {
      id: `trip-plan-${Date.now()}`,
      wishId,
      destination,
      startDate,
      endDate,
      travelDays,
      travelers,
      days: Array.from({ length: travelDays }, (_, i) => createEmptyDayPlan(i + 1)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tripPlans.push(newTripPlan);
    writeToFile(tripPlans);
    
    return NextResponse.json({ tripPlan: newTripPlan });
  } catch (error) {
    console.error('[Trip Plan] Error in POST:', error);
    return NextResponse.json(
      { error: 'Failed to create trip plan', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新旅行规划
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing trip plan id' },
        { status: 400 }
      );
    }
    
    const tripPlans = readFromFile();
    const planIndex = tripPlans.findIndex(plan => plan.id === id);
    
    if (planIndex === -1) {
      return NextResponse.json(
        { error: 'Trip plan not found' },
        { status: 404 }
      );
    }
    
    tripPlans[planIndex] = {
      ...tripPlans[planIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    writeToFile(tripPlans);
    
    return NextResponse.json({ tripPlan: tripPlans[planIndex] });
  } catch (error) {
    console.error('[Trip Plan] Error in PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update trip plan', details: String(error) },
      { status: 500 }
    );
  }
}