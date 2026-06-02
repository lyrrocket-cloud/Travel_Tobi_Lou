import { NextRequest, NextResponse } from 'next/server';
import { TripPlanDB } from '@/lib/database';

// 活动项接口
interface ActivityItem {
  id: string;
  type: string;
  startTime: string;
  endTime?: string;
  content?: string;
  location?: string;
  notes?: string;
}

// 交通信息接口
interface TransportInfo {
  id: string;
  type: string;
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
    
    let tripPlans;
    if (wishId) {
      const plan = await TripPlanDB.getByWishId(wishId);
      tripPlans = plan ? [plan] : [];
    } else {
      tripPlans = await TripPlanDB.getAll();
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
    
    // 检查是否已存在该愿望的旅行规划
    const existingPlan = await TripPlanDB.getByWishId(wishId);
    if (existingPlan) {
      return NextResponse.json(
        { error: 'Trip plan already exists for this wish' },
        { status: 400 }
      );
    }
    
    // 创建新的旅行规划
    const newTripPlan = await TripPlanDB.create({
      id: `trip-plan-${Date.now()}`,
      wishId,
      destination,
      startDate,
      endDate,
      travelDays,
      travelers,
      days: Array.from({ length: travelDays }, (_, i) => createEmptyDayPlan(i + 1)),
    });
    
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
    
    const updatedPlan = await TripPlanDB.update(id, updateData);
    
    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'Trip plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ tripPlan: updatedPlan });
  } catch (error) {
    console.error('[Trip Plan] Error in PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update trip plan', details: String(error) },
      { status: 500 }
    );
  }
}