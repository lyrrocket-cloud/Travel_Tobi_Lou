import { getSupabaseClient } from '@/storage/database/supabase-client';
import { readJsonFile, writeJsonFile, DATA_FILES } from '@/lib/storage';

let inMemoryTripPlans: any[] = readJsonFile(DATA_FILES.TRIP_PLANS, []);
let inMemoryTripExpenses: any[] = readJsonFile(DATA_FILES.TRIP_EXPENSES, []);
let inMemoryDefaultTrip: string | null = readJsonFile(DATA_FILES.DEFAULT_TRIP, null);

function saveTripPlans() {
  writeJsonFile(DATA_FILES.TRIP_PLANS, inMemoryTripPlans);
}

function saveTripExpenses() {
  writeJsonFile(DATA_FILES.TRIP_EXPENSES, inMemoryTripExpenses);
}

function saveDefaultTrip() {
  writeJsonFile(DATA_FILES.DEFAULT_TRIP, inMemoryDefaultTrip);
}

export const TripPlanDB = {
  async getAll(): Promise<any[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.from('trip_plans').select('*');
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        days: typeof item.days === 'string' ? JSON.parse(item.days) : item.days
      }));
    } catch (error) {
      console.warn('[Database] Using in-memory for trip plans:', error);
      return inMemoryTripPlans;
    }
  },

  async getByWishId(wishId: string): Promise<any | null> {
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
        days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
      };
    } catch (error) {
      console.warn('[Database] Using in-memory for trip plan:', error);
      return inMemoryTripPlans.find(p => p.wishId === wishId) || null;
    }
  },

  async create(plan: any): Promise<any> {
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
      
      return {
        ...data,
        wishId: data.wish_id,
        days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
      };
    } catch (error) {
      console.warn('[Database] Using in-memory for create trip plan:', error);
      
      const newPlan = {
        ...plan,
        id: plan.id || `trip-plan-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      inMemoryTripPlans.push(newPlan);
      saveTripPlans();
      
      return newPlan;
    }
  },

  async update(id: string, updateData: any): Promise<any | null> {
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
      
      return {
        ...data,
        wishId: data.wish_id,
        days: typeof data.days === 'string' ? JSON.parse(data.days) : data.days
      };
    } catch (error) {
      console.warn('[Database] Using in-memory for update trip plan:', error);
      
      const index = inMemoryTripPlans.findIndex(p => p.id === id);
      if (index === -1) return null;
      
      inMemoryTripPlans[index] = {
        ...inMemoryTripPlans[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      saveTripPlans();
      return inMemoryTripPlans[index];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const client = getSupabaseClient();
      await client.from('trip_plans').delete().eq('id', id);
    } catch (error) {
      console.warn('[Database] Using in-memory for delete trip plan:', error);
      
      inMemoryTripPlans = inMemoryTripPlans.filter(p => p.id !== id);
      saveTripPlans();
    }
  }
};

export const TripExpenseDB = {
  async getAll(): Promise<any[]> {
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
      console.warn('[Database] Using in-memory for trip expenses:', error);
      return inMemoryTripExpenses;
    }
  },

  async getByWishId(wishId: string): Promise<any | null> {
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
      console.warn('[Database] Using in-memory for trip expense:', error);
      return inMemoryTripExpenses.find(e => e.wishId === wishId) || null;
    }
  },

  async create(record: any): Promise<any> {
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
      
      return {
        ...data,
        wishId: data.wish_id,
        expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses
      };
    } catch (error) {
      console.warn('[Database] Using in-memory for create trip expense:', error);
      
      const newRecord = {
        ...record,
        id: record.id || `trip-expense-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      inMemoryTripExpenses.push(newRecord);
      saveTripExpenses();
      
      return newRecord;
    }
  },

  async update(id: string, updateData: any): Promise<any | null> {
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
      
      return {
        ...data,
        wishId: data.wish_id,
        expenses: typeof data.expenses === 'string' ? JSON.parse(data.expenses) : data.expenses
      };
    } catch (error) {
      console.warn('[Database] Using in-memory for update trip expense:', error);
      
      const index = inMemoryTripExpenses.findIndex(e => e.id === id);
      if (index === -1) return null;
      
      inMemoryTripExpenses[index] = {
        ...inMemoryTripExpenses[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      saveTripExpenses();
      return inMemoryTripExpenses[index];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const client = getSupabaseClient();
      await client.from('trip_expenses').delete().eq('id', id);
    } catch (error) {
      console.warn('[Database] Using in-memory for delete trip expense:', error);
      
      inMemoryTripExpenses = inMemoryTripExpenses.filter(e => e.id !== id);
      saveTripExpenses();
    }
  }
};

export const DefaultTripDB = {
  async get(): Promise<string | null> {
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
      console.warn('[Database] Using in-memory for default trip:', error);
      return inMemoryDefaultTrip;
    }
  },

  async set(wishId: string): Promise<void> {
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
    } catch (error) {
      console.warn('[Database] Using in-memory for set default trip:', error);
      
      inMemoryDefaultTrip = wishId;
      saveDefaultTrip();
    }
  },

  async clear(): Promise<void> {
    try {
      const client = getSupabaseClient();
      await client.from('default_trip').delete();
    } catch (error) {
      console.warn('[Database] Using in-memory for clear default trip:', error);
      
      inMemoryDefaultTrip = null;
      saveDefaultTrip();
    }
  }
};