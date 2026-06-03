import { getSupabaseClient } from '@/storage/database/supabase-client';
import { readJsonFile, writeJsonFile, DATA_FILES, getDataDir } from '@/lib/storage';

let inMemoryTripPlans: any[] = readJsonFile(DATA_FILES.TRIP_PLANS, []);
let inMemoryTripExpenses: any[] = readJsonFile(DATA_FILES.TRIP_EXPENSES, []);
let inMemoryDefaultTrip: string | null = readJsonFile(DATA_FILES.DEFAULT_TRIP, null);

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
    const client = getSupabaseClient();
    // 尝试查询一个简单的表来验证连接
    await client.from('trip_plans').select('id').limit(1);
    isDatabaseAvailable = true;
    console.log('[Database] Connection verified - using database storage');
    return true;
  } catch (error) {
    isDatabaseAvailable = false;
    console.warn('[Database] Supabase not available - using file storage fallback');
    console.warn('[Database] Storage path:', getDataDir());
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
          days: typeof item.days === 'string' ? JSON.parse(item.days) : item.days
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
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
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
        const { data, error } = await client
          .from('trip_plans')
          .insert({
            ...plan,
            wish_id: plan.wishId,
            days: JSON.stringify(plan.days)
          })
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('[Database] Saved trip plan to database');
        return {
          ...data,
          wishId: data.wish_id,
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
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
        
        if (processedData.wishId) {
          processedData.wish_id = processedData.wishId;
          delete processedData.wishId;
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
          days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
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
          expenses: typeof item.expenses === 'string' ? JSON.parse(item.expenses) : item.expenses
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
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses
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
            ...record,
            wish_id: record.wishId,
            expenses: JSON.stringify(record.expenses)
          })
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('[Database] Saved trip expense to database');
        return {
          ...data,
          wishId: data.wish_id,
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses
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
          expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses
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