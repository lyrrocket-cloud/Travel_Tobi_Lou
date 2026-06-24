import { getSupabaseClient } from '@/storage/database/supabase-client';
import { readJsonFile, writeJsonFile, DATA_FILES, getDataDir } from '@/lib/storage';

let inMemoryTripPlans: any[] = readJsonFile(DATA_FILES.TRIP_PLANS, []);
let inMemoryTripExpenses: any[] = readJsonFile(DATA_FILES.TRIP_EXPENSES, []);
let inMemoryDefaultTrip: string | null = readJsonFile(DATA_FILES.DEFAULT_TRIP, null);
let inMemoryExchangeRates: any = readJsonFile(DATA_FILES.EXCHANGE_RATES, null);

// 标记数据库是否可用
let isDatabaseAvailable = true;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 5000; // 5秒检查一次数据库状态

async function checkDatabaseAvailability(): Promise<boolean> {
  const now = Date.now();
  if (now - lastDbCheck < DB_CHECK_INTERVAL && lastDbCheck > 0) {
    return isDatabaseAvailable;
  }
  
  lastDbCheck = now;
  
  try {
    console.log('[Database] Checking database availability...');
    const client = getSupabaseClient();
    // 尝试查询一个简单的表来验证连接
    await client.from('trip_plans').select('id').limit(1);
    isDatabaseAvailable = true;
    console.log('[Database] Connection verified - using database storage');
    return true;
  } catch (error) {
    isDatabaseAvailable = false;
    console.error('[Database] Supabase not available - error:', error);
    console.error('[Database] Storage path:', getDataDir());
    console.error('[Database] COZE_SUPABASE_URL set:', !!process.env.COZE_SUPABASE_URL);
    console.error('[Database] COZE_SUPABASE_ANON_KEY set:', !!process.env.COZE_SUPABASE_ANON_KEY);
    return false;
  }
}

function saveTripPlans() {
  const success = writeJsonFile(DATA_FILES.TRIP_PLANS, inMemoryTripPlans);
  if (success) {
    console.log('[Database] Saved trip plans to file:', getDataDir());
  }
  return success;
}

function saveTripExpenses() {
  const success = writeJsonFile(DATA_FILES.TRIP_EXPENSES, inMemoryTripExpenses);
  if (success) {
    console.log('[Database] Saved trip expenses to file:', getDataDir());
  }
  return success;
}

function saveDefaultTrip() {
  const success = writeJsonFile(DATA_FILES.DEFAULT_TRIP, inMemoryDefaultTrip);
  if (success) {
    console.log('[Database] Saved default trip to file:', getDataDir());
  }
  return success;
}

function saveExchangeRates() {
  const success = writeJsonFile(DATA_FILES.EXCHANGE_RATES, inMemoryExchangeRates);
  if (success) {
    console.log('[Database] Saved exchange rates to file:', getDataDir());
  }
  return success;
}

export const TripPlanDB = {
  async getAll(): Promise<any[]> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.from('trip_plans').select('*');
        
        if (error) throw error;
        
        return data.map(item => ({
          ...item,
          wishId: item.wish_id,
          startDate: item.start_date,
          endDate: item.end_date,
          travelDays: item.travel_days,
          days: typeof item.days === 'string' ? JSON.parse(item.days) : item.days,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
      } catch (error) {
        console.error('[Database] Error fetching trip plans from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for trip plans');
    return inMemoryTripPlans;
  },

  async getByWishId(wishId: string): Promise<any | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('trip_plans')
          .select('*')
          .eq('wish_id', wishId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          travelDays: data.travel_days,
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error fetching trip plan from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for trip plan lookup');
    return inMemoryTripPlans.find(p => String(p.wishId) === String(wishId)) || null;
  },

  async create(plan: any): Promise<any> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const dbRecord: any = {
          id: plan.id || `trip-plan-${Date.now()}`,
          wish_id: plan.wishId,
          destination: plan.destination,
          start_date: plan.startDate || null,
          end_date: plan.endDate || null,
          travel_days: plan.travelDays,
          travelers: plan.travelers,
          days: JSON.stringify(plan.days || []),
          created_at: plan.createdAt || new Date().toISOString(),
          updated_at: plan.updatedAt || new Date().toISOString()
        };
        
        const { data, error } = await client
          .from('trip_plans')
          .insert(dbRecord)
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('[Database] Saved trip plan to database');
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          travelDays: data.travel_days,
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error saving trip plan to DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip plan creation');
    
    const newPlan = {
      ...plan,
      id: plan.id || `trip-plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    inMemoryTripPlans.push(newPlan);
    saveTripPlans();
    
    return newPlan;
  },

  async update(id: string, updateData: any): Promise<any | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const processedData: any = { ...updateData };
        
        // 转换 camelCase 到 snake_case
        if (processedData.wishId !== undefined) {
          processedData.wish_id = processedData.wishId;
          delete processedData.wishId;
        }
        if (processedData.startDate !== undefined) {
          processedData.start_date = processedData.startDate;
          delete processedData.startDate;
        }
        if (processedData.endDate !== undefined) {
          processedData.end_date = processedData.endDate;
          delete processedData.endDate;
        }
        if (processedData.travelDays !== undefined) {
          processedData.travel_days = processedData.travelDays;
          delete processedData.travelDays;
        }
        if (processedData.days) {
          processedData.days = JSON.stringify(processedData.days);
        }
        
        const { data, error } = await client
          .from('trip_plans')
          .update(processedData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        console.log('[Database] Updated trip plan in database');
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          travelDays: data.travel_days,
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error updating trip plan in DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip plan update');
    
    const index = inMemoryTripPlans.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    inMemoryTripPlans[index] = {
      ...inMemoryTripPlans[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    saveTripPlans();
    return inMemoryTripPlans[index];
  },

  async delete(id: string): Promise<void> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('trip_plans').delete().eq('id', id);
        console.log('[Database] Deleted trip plan from database');
        return;
      } catch (error) {
        console.error('[Database] Error deleting trip plan from DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip plan deletion');
    
    inMemoryTripPlans = inMemoryTripPlans.filter(p => p.id !== id);
    saveTripPlans();
  }
};

export const TripExpenseDB = {
  async getAll(): Promise<any[]> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.from('trip_expenses').select('*');
        
        if (error) throw error;
        
        return data.map(item => ({
          ...item,
          wishId: item.wish_id,
          startDate: item.start_date,
          endDate: item.end_date,
          expenses: typeof item.expenses === 'string' ? JSON.parse(item.expenses) : item.expenses,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
      } catch (error) {
        console.error('[Database] Error fetching trip expenses from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for trip expenses');
    return inMemoryTripExpenses;
  },

  async getByWishId(wishId: string): Promise<any | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('trip_expenses')
          .select('*')
          .eq('wish_id', wishId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error fetching trip expense from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for trip expense lookup');
    return inMemoryTripExpenses.find(e => String(e.wishId) === String(wishId)) || null;
  },

  async create(record: any): Promise<any> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('trip_expenses')
          .insert({
            id: record.id,
            wish_id: record.wishId,
            destination: record.destination,
            start_date: record.startDate,
            end_date: record.endDate,
            expenses: JSON.stringify(record.expenses)
          })
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('[Database] Saved trip expense to database');
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error saving trip expense to DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip expense creation');
    
    const newRecord = {
      ...record,
      id: record.id || `trip-expense-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    inMemoryTripExpenses.push(newRecord);
    saveTripExpenses();
    
    return newRecord;
  },

  async update(id: string, updateData: any): Promise<any | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const processedData: any = { ...updateData };
        
        if (processedData.wishId) {
          processedData.wish_id = processedData.wishId;
          delete processedData.wishId;
        }
        if (processedData.expenses) {
          processedData.expenses = JSON.stringify(processedData.expenses);
        }
        
        const { data, error } = await client
          .from('trip_expenses')
          .update(processedData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        console.log('[Database] Updated trip expense in database');
        return {
          ...data,
          wishId: data.wish_id,
          startDate: data.start_date,
          endDate: data.end_date,
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('[Database] Error updating trip expense in DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip expense update');
    
    const index = inMemoryTripExpenses.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    inMemoryTripExpenses[index] = {
      ...inMemoryTripExpenses[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    saveTripExpenses();
    return inMemoryTripExpenses[index];
  },

  async delete(id: string): Promise<void> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('trip_expenses').delete().eq('id', id);
        console.log('[Database] Deleted trip expense from database');
        return;
      } catch (error) {
        console.error('[Database] Error deleting trip expense from DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for trip expense deletion');
    
    inMemoryTripExpenses = inMemoryTripExpenses.filter(e => e.id !== id);
    saveTripExpenses();
  }
};

export const DefaultTripDB = {
  async get(): Promise<string | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('default_trip')
          .select('wish_id')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        return data.wish_id || null;
      } catch (error) {
        console.error('[Database] Error fetching default trip from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for default trip');
    return inMemoryDefaultTrip;
  },

  async set(wishId: string): Promise<void> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        
        const { data: existing, error: checkError } = await client
          .from('default_trip')
          .select('id')
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
        
        if (existing) {
          await client
            .from('default_trip')
            .update({ wish_id: wishId })
            .eq('id', existing.id);
        } else {
          await client
            .from('default_trip')
            .insert({ wish_id: wishId });
        }
        
        console.log('[Database] Saved default trip to database');
        return;
      } catch (error) {
        console.error('[Database] Error saving default trip to DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for default trip');
    
    inMemoryDefaultTrip = wishId;
    saveDefaultTrip();
  },

  async clear(): Promise<void> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('default_trip').delete();
        console.log('[Database] Cleared default trip from database');
        return;
      } catch (error) {
        console.error('[Database] Error clearing default trip from DB:', error);
      }
    }
    
    // Fallback to file storage
    console.warn('[Database] Falling back to file storage for clear default trip');
    
    inMemoryDefaultTrip = null;
    saveDefaultTrip();
  }
};

export const ExchangeRateDB = {
  async get(): Promise<{ customExchangeRates: Record<string, number> | null; activeCurrencies: string[]; lastUpdated: string } | null> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('exchange_rates')
          .select('*')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        return {
          customExchangeRates: typeof data.custom_exchange_rates === 'string'
            ? JSON.parse(data.custom_exchange_rates)
            : data.custom_exchange_rates,
          activeCurrencies: Array.isArray(data.active_currencies)
            ? data.active_currencies
            : (typeof data.active_currencies === 'string' ? JSON.parse(data.active_currencies) : []),
          lastUpdated: data.updated_at || data.last_updated || new Date().toISOString(),
        };
      } catch (error) {
        console.error('[Database] Error fetching exchange rates from DB:', error);
      }
    }
    
    console.log('[Database] Using file storage for exchange rates');
    return inMemoryExchangeRates;
  },

  async set(data: { customExchangeRates: Record<string, number> | null; activeCurrencies: string[]; lastUpdated: string }): Promise<void> {
    const dbAvailable = await checkDatabaseAvailability();
    
    if (dbAvailable) {
      try {
        const client = getSupabaseClient();
        
        const { data: existing, error: checkError } = await client
          .from('exchange_rates')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
        
        if (existing) {
          await client
            .from('exchange_rates')
            .update({
              custom_exchange_rates: data.customExchangeRates,
              active_currencies: data.activeCurrencies,
              updated_at: data.lastUpdated,
            })
            .eq('id', existing.id);
        } else {
          await client
            .from('exchange_rates')
            .insert({
              id: 'default',
              custom_exchange_rates: data.customExchangeRates,
              active_currencies: data.activeCurrencies,
              updated_at: data.lastUpdated,
            });
        }
        
        console.log('[Database] Saved exchange rates to database');
        return;
      } catch (error) {
        console.error('[Database] Error saving exchange rates to DB:', error);
      }
    }
    
    console.warn('[Database] Falling back to file storage for exchange rates');
    
    inMemoryExchangeRates = data;
    saveExchangeRates();
  },
};