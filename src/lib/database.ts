import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface ActivityItem {
  id: string;
  type: string;
  startTime: string;
  endTime?: string;
  content?: string;
  location?: string;
  notes?: string;
}

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
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  activities: ActivityItem[];
  transport: TransportInfo[];
}

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

export interface ExpenseItem {
  id: string;
  wishId: string;
  date: string;
  time: string;
  category: string;
  amount: number;
  description: string;
  payer?: string;
  payers?: string[];
  createdAt: string;
  updatedAt: string;
}

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

export class TripPlanDB {
  static async getAll(): Promise<TripPlan[]> {
    const client = getSupabaseClient();
    const result = await client.from('trip_plans').select('*');
    return result.data?.map(this.convertFromDb) || [];
  }

  static async getByWishId(wishId: string): Promise<TripPlan | null> {
    const client = getSupabaseClient();
    const result = await client.from('trip_plans').select('*').eq('wish_id', wishId).single();
    if (result.error) {
      if (result.error.code === 'PGRST116') return null;
      throw result.error;
    }
    return this.convertFromDb(result.data);
  }

  static async create(plan: Omit<TripPlan, 'createdAt' | 'updatedAt'>): Promise<TripPlan> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const data = {
      ...plan,
      days: JSON.stringify(plan.days),
      created_at: now,
      updated_at: now,
    };
    const result = await client.from('trip_plans').insert(data).select('*').single();
    if (result.error) throw result.error;
    return this.convertFromDb(result.data);
  }

  static async update(id: string, updateData: Partial<Omit<TripPlan, 'id' | 'createdAt'>>): Promise<TripPlan | null> {
    const client = getSupabaseClient();
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updateData.wishId) data.wish_id = updateData.wishId;
    if (updateData.destination) data.destination = updateData.destination;
    if (updateData.startDate !== undefined) data.start_date = updateData.startDate;
    if (updateData.endDate !== undefined) data.end_date = updateData.endDate;
    if (updateData.travelDays !== undefined) data.travel_days = updateData.travelDays;
    if (updateData.travelers) data.travelers = updateData.travelers;
    if (updateData.days !== undefined) data.days = JSON.stringify(updateData.days);
    
    const result = await client.from('trip_plans').update(data).eq('id', id).select('*').single();
    if (result.error) {
      if (result.error.code === 'PGRST116') return null;
      throw result.error;
    }
    return this.convertFromDb(result.data);
  }

  static async delete(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    const result = await client.from('trip_plans').delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  }

  private static convertFromDb(data: any): TripPlan {
    return {
      id: data.id,
      wishId: data.wish_id,
      destination: data.destination,
      startDate: data.start_date,
      endDate: data.end_date,
      travelDays: data.travel_days,
      travelers: data.travelers,
      days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export class TripExpenseDB {
  static async getAll(): Promise<TripExpenseRecord[]> {
    const client = getSupabaseClient();
    const result = await client.from('trip_expenses').select('*');
    return result.data?.map(this.convertFromDb) || [];
  }

  static async getByWishId(wishId: string): Promise<TripExpenseRecord | null> {
    const client = getSupabaseClient();
    const result = await client.from('trip_expenses').select('*').eq('wish_id', wishId).single();
    if (result.error) {
      if (result.error.code === 'PGRST116') return null;
      throw result.error;
    }
    return this.convertFromDb(result.data);
  }

  static async create(record: Omit<TripExpenseRecord, 'createdAt' | 'updatedAt'>): Promise<TripExpenseRecord> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const data = {
      ...record,
      expenses: JSON.stringify(record.expenses),
      created_at: now,
      updated_at: now,
    };
    const result = await client.from('trip_expenses').insert(data).select('*').single();
    if (result.error) throw result.error;
    return this.convertFromDb(result.data);
  }

  static async update(id: string, updateData: Partial<Omit<TripExpenseRecord, 'id' | 'createdAt'>>): Promise<TripExpenseRecord | null> {
    const client = getSupabaseClient();
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updateData.wishId) data.wish_id = updateData.wishId;
    if (updateData.destination) data.destination = updateData.destination;
    if (updateData.startDate !== undefined) data.start_date = updateData.startDate;
    if (updateData.endDate !== undefined) data.end_date = updateData.endDate;
    if (updateData.expenses !== undefined) data.expenses = JSON.stringify(updateData.expenses);
    
    const result = await client.from('trip_expenses').update(data).eq('id', id).select('*').single();
    if (result.error) {
      if (result.error.code === 'PGRST116') return null;
      throw result.error;
    }
    return this.convertFromDb(result.data);
  }

  static async delete(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    const result = await client.from('trip_expenses').delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  }

  private static convertFromDb(data: any): TripExpenseRecord {
    return {
      id: data.id,
      wishId: data.wish_id,
      destination: data.destination,
      startDate: data.start_date,
      endDate: data.end_date,
      expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export class DefaultTripDB {
  static async get(): Promise<string | null> {
    const client = getSupabaseClient();
    const result = await client.from('default_trip').select('wish_id').limit(1).single();
    if (result.error) {
      if (result.error.code === 'PGRST116') return null;
      throw result.error;
    }
    return result.data?.wish_id || null;
  }

  static async set(wishId: string): Promise<void> {
    const client = getSupabaseClient();
    await client.from('default_trip').delete();
    const now = new Date().toISOString();
    await client.from('default_trip').insert({ wish_id: wishId, created_at: now, updated_at: now });
  }

  static async clear(): Promise<void> {
    const client = getSupabaseClient();
    await client.from('default_trip').delete();
  }
}