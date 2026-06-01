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
  time: string;
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