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

// 货币类型
export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'HKD' | 'TWD' | 'THB' | 'SGD' | 'MYR' | 'VND';

// 自定义货币（支持备注，如现金、信用卡等）
export interface CustomCurrency {
  id: string;           // 唯一标识，格式：基础代码_备注（无备注时就是基础代码）
  baseCode: CurrencyCode; // 基础货币代码
  note?: string;        // 备注（现金、信用卡等）
  rate: number;         // 相对于人民币的汇率
}

// 货币信息接口
export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  exchangeRate: number; // 相对于人民币的汇率
  updatedAt: string;
}

// 汇率记录接口
export interface ExchangeRateRecord {
  code: string;         // 货币ID（可能是带备注的自定义货币）
  baseCode: CurrencyCode;
  note?: string;
  rate: number; // 1 外币 = ? 人民币
  updatedAt: string;
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
  time: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;     // 货币ID（可能是带备注的自定义货币）
  description: string;
  location?: string;
  payer?: string;
  payers?: string[];
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
  endDayOffset?: number;
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

// 驾驶行为类型
export type DrivingBehavior = 
  | 'normal'           // 正常驾驶
  | 'speeding'         // 超速
  | 'harsh_brake'      // 急刹车
  | 'rapid_accelerate' // 急加速
  | 'fatigue'          // 疲劳驾驶
  | 'phone_use'        // 使用手机
  | 'lane_violation'   // 变道违规
  | 'red_light'        // 闯红灯
  | 'safe_driving';    // 安全驾驶（加分项）

// 驾驶积分规则
export interface DrivingScoreRule {
  behavior: DrivingBehavior;
  score: number; // 正数加分，负数扣分
  description: string;
}

// 驾驶记录项接口
export interface DrivingRecordItem {
  id: string;
  wishId: string;
  date: string;
  time: string;
  driver: string;
  startLocation: string;
  endLocation: string;
  distance?: number; // 行驶里程（公里）
  duration?: number; // 行驶时长（分钟）
  score: number; // 本次积分
  behaviors: Array<{
    type: DrivingBehavior;
    timestamp?: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// 旅行驾驶记录接口
export interface TripDrivingRecord {
  id: string;
  wishId: string;
  destination: string;
  startDate?: string;
  records: DrivingRecordItem[];
  createdAt: string;
  updatedAt: string;
}

// 驾驶员统计信息
export interface DriverStatistics {
  driver: string;
  totalScore: number;
  totalDistance: number;
  totalDuration: number;
  totalTrips: number;
  behaviorCounts: Record<DrivingBehavior, number>;
}
