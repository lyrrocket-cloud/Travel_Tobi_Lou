export interface Wish {
  id: string;
  destination: string;
  travel_month: string;
  travel_year: number;
  wisher_name: string;
  is_confirmed: number;
  is_expired?: number;
  confirmed_date?: string;
  travelers?: string;
  followers_count: number;
  followers: string[];
}

// 支出类别
export type ExpenseCategory = 
  | 'transportation'  // 交通
  | 'accommodation'   // 住宿
  | 'food'            // 餐饮
  | 'entertainment'   // 娱乐
  | 'shopping'        // 购物
  | 'attraction'      // 景点门票
  | 'other';          // 其他

// 支出项接口
export interface ExpenseItem {
  id: string;
  wishId: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  payer?: string;
  createdAt: string;
  updatedAt: string;
}

// 旅行账单记录接口
export interface TripExpenseRecord {
  id: string;
  wishId: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  expenses: ExpenseItem[];
  createdAt: string;
  updatedAt: string;
}

// 活动项接口
export interface ActivityItem {
  id: string;
  type: string;
  startTime: string;
  endTime?: string;
  content?: string;
  location?: string;
  notes?: string;
}

// 交通信息接口
export interface TransportInfo {
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
  afterTime?: 'breakfast' | 'lunch' | 'dinner';
}

// 日程计划接口
export interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  activities: ActivityItem[];
  transport: TransportInfo[];
}

// 旅行计划接口
export interface TripPlan {
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