'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, RefreshCw, Coins, Receipt, Car, BedDouble, MapPin, ShoppingBag, Gamepad2, Clock, Plane, Train, Bus, Save, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wish, TripExpenseRecord, ExpenseItem, ExpenseCategory } from '@/types';
import { TripPlan } from '@/types';

const expenseCategories: Record<string, string> = {
  accommodation: '住宿',
  attraction: '景点',
  shopping: '购物',
  entertainment: '娱乐',
  food: '餐饮',
  transportation: '交通',
  other: '其它'
};

const transportTypeMap: Record<string, string> = {
  flight: '飞机',
  train: '火车',
  bus: '大巴',
  taxi: '出租车',
  walk: '步行',
  car: '自驾',
  other: '其他'
};

const expenseCategoryIcons: Record<string, React.ReactNode> = {
  accommodation: <BedDouble className="w-4 h-4" />,
  attraction: <MapPin className="w-4 h-4" />,
  shopping: <ShoppingBag className="w-4 h-4" />,
  entertainment: <Gamepad2 className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
  transportation: <Car className="w-4 h-4" />,
  other: <Clock className="w-4 h-4" />,
};

interface TripAccountingProps {
  confirmedWishes: Wish[];
  isAdminMode?: boolean;
  onEditTripInfo?: (info: {
    id: string;
    confirmed_date?: string;
    travelDays?: number;
    travelers?: string;
    destination?: string;
  }) => void;
}

export default function TripAccounting({ confirmedWishes, isAdminMode = false, onEditTripInfo }: TripAccountingProps) {
  const [tripExpenses, setTripExpenses] = useState<TripExpenseRecord[]>([]);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('entry');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editingSelectedActivity, setEditingSelectedActivity] = useState<ReturnType<typeof getActivityLocations>[0] | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializedFromStorage, setInitializedFromStorage] = useState(false);
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  
  const [newExpense, setNewExpense] = useState<{
    date: string;
    time: string;
    category: string;
    amount: string;
    description: string;
    location: string;
    payers: string[];
    payer: string | null;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    category: 'other',
    amount: '',
    description: '',
    location: '',
    payers: [],
    payer: null,
  });

  const [selectedActivity, setSelectedActivity] = useState<{
    dayNumber: number;
    activityId: string;
    location: string;
    startTime: string;
    endTime?: string;
    date: string;
    content?: string;
  } | null>(null);

  const [analysisConsumerFilter, setAnalysisConsumerFilter] = useState<string | null>(null);

  const currentExpenseRecord = selectedWishId ? 
    tripExpenses.find(record => String(record.wishId) === String(selectedWishId)) : null;

  const currentTripPlan = selectedWishId ?
    tripPlans.find(p => String(p.wishId) === String(selectedWishId)) : null;

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/trip-expenses');
      const data = await response.json();
      const expenses = data.tripExpenses || [];
      setTripExpenses(expenses);
      return expenses;
    } catch (error) {
      console.error('[Trip Accounting] Error fetching expenses:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchTripPlans = async () => {
    try {
      const response = await fetch('/api/trip-plans');
      const data = await response.json();
      setTripPlans(data.tripPlans || []);
    } catch (error) {
      console.error('[Trip Accounting] Error fetching trip plans:', error);
    }
  };

  useEffect(() => {
    // 从数据库获取默认旅行
    const fetchDefaultTrip = async () => {
      try {
        const response = await fetch('/api/default-trip');
        const data = await response.json();
        if (data.wishId) {
          setDefaultTripId(data.wishId);
        }
      } catch (error) {
        console.error('[Trip Accounting] Failed to fetch default trip:', error);
      } finally {
        setInitializedFromStorage(true);
      }
    };
    
    fetchDefaultTrip();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage) {
      localStorage.setItem('travel-toolbox-accounting-wish-id', selectedWishId);
    }
  }, [selectedWishId, initializedFromStorage]);

  useEffect(() => {
    if (typeof window !== 'undefined' && initializedFromStorage && defaultTripId) {
      localStorage.setItem('travel-toolbox-default-trip-id', defaultTripId);
    }
  }, [defaultTripId, initializedFromStorage]);

  useEffect(() => {
    console.debug('[Trip Accounting] Initializing...');
    Promise.all([
      fetchExpenses(),
      fetchTripPlans()
    ]).then(() => {
      console.debug('[Trip Accounting] Data loaded');
    });
  }, []);

  // 监听自定义事件，确保同步更新
  useEffect(() => {
    const handleDefaultTripChanged = (e: any) => {
      if (e.detail && e.detail.defaultTripId) {
        setDefaultTripId(e.detail.defaultTripId);
      }
    };

    window.addEventListener('default-trip-changed', handleDefaultTripChanged as EventListener);
    return () => {
      window.removeEventListener('default-trip-changed', handleDefaultTripChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (selectedWishId) {
      console.debug('[Trip Accounting] selectedWishId changed:', selectedWishId);
      console.debug('[Trip Accounting] tripExpenses:', tripExpenses);
      const record = tripExpenses.find(r => String(r.wishId) === String(selectedWishId));
      console.debug('[Trip Accounting] Found record:', record);
    }
  }, [selectedWishId, tripExpenses]);

  useEffect(() => {
    if (!initializedFromStorage) return;
    if (loading) return;
    if (confirmedWishes.length === 0) return;
    
    // 首先尝试使用已选中的wishId（如果存在且有效）
    if (selectedWishId) {
      const wishExists = confirmedWishes.some(wish => String(wish.id) === selectedWishId);
      if (wishExists) {
        return;
      }
    }
    
    // 然后尝试使用默认旅行ID
    if (defaultTripId) {
      const defaultWishExists = confirmedWishes.some(wish => String(wish.id) === defaultTripId);
      if (defaultWishExists) {
        setSelectedWishId(defaultTripId);
        return;
      }
    }
    
    // 最后选择第一个有记录的旅行或第一个旅行
    const firstWishWithRecord = confirmedWishes.find(wish => 
      tripExpenses.some(record => String(record.wishId) === String(wish.id))
    );
    if (firstWishWithRecord) {
      setSelectedWishId(String(firstWishWithRecord.id));
    } else {
      // 如果第一个旅行没有expense record，先创建一个
      const firstWish = confirmedWishes[0];
      const hasRecord = tripExpenses.some(record => String(record.wishId) === String(firstWish.id));
      if (!hasRecord) {
        // 自动创建expense record
        fetch('/api/trip-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wishId: String(firstWish.id),
            destination: firstWish.destination,
            startDate: firstWish.confirmed_date,
          }),
        }).then(response => {
          if (response.ok) {
            fetchExpenses();
          }
        }).catch(error => {
          console.error('[Trip Accounting] Error creating expense record:', error);
        });
      }
      setSelectedWishId(String(firstWish.id));
    }
  }, [confirmedWishes, tripExpenses, selectedWishId, initializedFromStorage, loading, defaultTripId]);

  const createExpenseRecord = async (wish: Wish) => {
    try {
      const response = await fetch('/api/trip-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishId: String(wish.id),
          destination: wish.destination,
          startDate: wish.confirmed_date,
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        setSelectedWishId(String(wish.id));
        setShowWishSelector(false);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error creating expense record:', error);
    }
  };

  const addExpense = async () => {
    console.debug('[Trip Accounting] addExpense called');
    console.debug('[Trip Accounting] selectedWishId:', selectedWishId);
    console.debug('[Trip Accounting] tripExpenses:', tripExpenses);
    console.debug('[Trip Accounting] currentExpenseRecord:', currentExpenseRecord);
    
    // 使用局部变量存储当前可用的expenses
    let availableExpenses = tripExpenses;
    let targetRecord = currentExpenseRecord;
    
    // 如果没有expense record，先创建一个
    if (!targetRecord && selectedWishId) {
      console.log('[Trip Accounting] No expense record, creating one...');
      const wish = confirmedWishes.find(w => String(w.id) === selectedWishId);
      if (wish) {
        try {
          const response = await fetch('/api/trip-expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wishId: String(wish.id),
              destination: wish.destination,
              startDate: wish.confirmed_date,
            }),
          });

          if (response.ok) {
            // 重新获取所有expenses并使用返回的数据
            availableExpenses = await fetchExpenses();
            targetRecord = availableExpenses.find(r => String(r.wishId) === String(selectedWishId));
            if (!targetRecord) {
              console.error('[Trip Accounting] Expense record still not found after creation');
              return;
            }
          } else {
            console.error('[Trip Accounting] Failed to create expense record');
            return;
          }
        } catch (error) {
          console.error('[Trip Accounting] Error creating expense record:', error);
          return;
        }
      } else {
        console.error('[Trip Accounting] Wish not found for selectedWishId:', selectedWishId);
        return;
      }
    }
    
    // 再次检查record（从可用数据中查找）
    if (!targetRecord && selectedWishId) {
      targetRecord = availableExpenses.find(r => String(r.wishId) === String(selectedWishId));
    }
    
    if (!targetRecord) {
      console.error('[Trip Accounting] No expense record available');
      return;
    }
    
    if (!newExpense.amount) {
      console.error('[Trip Accounting] Amount is required');
      return;
    }
    if (!newExpense.date) {
      console.error('[Trip Accounting] Date is required');
      return;
    }
    if (!newExpense.payers || newExpense.payers.length === 0) {
      console.error('[Trip Accounting] Payers are required');
      return;
    }
    if (!newExpense.payer) {
      console.error('[Trip Accounting] Payer is required');
      return;
    }

    const expenseItem: ExpenseItem = {
      id: `expense-${Date.now()}`,
      wishId: targetRecord.wishId,
      date: newExpense.date,
      time: newExpense.time,
      category: newExpense.category as ExpenseCategory,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      location: newExpense.location,
      payer: newExpense.payer,
      payers: newExpense.payers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/trip-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetRecord.id,
          expenses: [...targetRecord.expenses, expenseItem],
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        setShowAddExpense(false);
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          category: 'other',
          amount: '',
          description: '',
          location: '',
          payers: [],
          payer: null,
        });
        setSelectedActivity(null);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error adding expense:', error);
    }
  };

  const saveEditedExpense = async () => {
    if (!currentExpenseRecord || !editingExpense) return;

    const updatedExpenses = currentExpenseRecord.expenses.map(expense => {
      if (expense.id === editingExpense.id) {
        return {
          ...editingExpense,
          updatedAt: new Date().toISOString(),
        };
      }
      return expense;
    });

    try {
      const response = await fetch('/api/trip-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentExpenseRecord.id,
          expenses: updatedExpenses,
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        setShowEditExpense(false);
        setEditingExpense(null);
        setEditingSelectedActivity(null);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error saving edited expense:', error);
    }
  };

  const deleteExpense = async () => {
    if (!currentExpenseRecord || !deletingExpenseId) return;

    const updatedExpenses = currentExpenseRecord.expenses.filter(
      expense => expense.id !== deletingExpenseId
    );

    try {
      const response = await fetch('/api/trip-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentExpenseRecord.id,
          expenses: updatedExpenses,
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        setShowDeleteConfirm(false);
        setDeletingExpenseId(null);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error deleting expense:', error);
    }
  };

  const calculateStats = () => {
    if (!currentExpenseRecord) return { total: 0, categories: {} as Record<string, number>, byPayer: {} as Record<string, number>, byConsumer: {} as Record<string, number> };

    const stats = {
      total: 0,
      categories: {} as Record<string, number>,
      byPayer: {} as Record<string, number>,
      byConsumer: {} as Record<string, number>,
    };

    currentExpenseRecord.expenses.forEach(expense => {
      stats.total += expense.amount;
      stats.categories[expense.category] = (stats.categories[expense.category] || 0) + expense.amount;
      if (expense.payer) {
        stats.byPayer[expense.payer] = (stats.byPayer[expense.payer] || 0) + expense.amount;
      }
      if (expense.payers && expense.payers.length > 0) {
        const perPersonAmount = expense.amount / expense.payers.length;
        expense.payers.forEach(payer => {
          stats.byConsumer[payer] = (stats.byConsumer[payer] || 0) + perPersonAmount;
        });
      }
    });

    return stats;
  };

  const stats = calculateStats();

  const calculateFilteredStats = () => {
    if (!currentExpenseRecord) {
      return {
        total: 0,
        categories: {} as Record<string, number>,
        byPayer: {} as Record<string, number>,
        byConsumer: {} as Record<string, number>,
      };
    }

    if (!analysisConsumerFilter) {
      return stats;
    }

    const filtered = {
      total: 0,
      categories: {} as Record<string, number>,
      byPayer: {} as Record<string, number>,
      byConsumer: {} as Record<string, number>,
    };

    // 处理按类别、总支出、按消费人的统计（使用分摊金额）
    currentExpenseRecord.expenses.forEach(expense => {
      if (expense.payers && expense.payers.includes(analysisConsumerFilter)) {
        const perPersonAmount = expense.amount / expense.payers.length;
        filtered.total += perPersonAmount;
        filtered.categories[expense.category] = (filtered.categories[expense.category] || 0) + perPersonAmount;
      }
    });

    // 处理按支付人的统计（只包含筛选出行人作为支付人的完整金额）
    currentExpenseRecord.expenses.forEach(expense => {
      if (expense.payer === analysisConsumerFilter) {
        filtered.byPayer[expense.payer] = (filtered.byPayer[expense.payer] || 0) + expense.amount;
      }
    });

    if (analysisConsumerFilter) {
      filtered.byConsumer[analysisConsumerFilter] = filtered.total;
    }

    return filtered;
  };

  const filteredStats = calculateFilteredStats();

  const sortedExpenses = currentExpenseRecord ? 
    [...currentExpenseRecord.expenses].sort((a, b) => {
      // 先比较日期
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // 日期相同则比较时间
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.time) return 1; // 有时间的排后面
      if (b.time) return -1;
      return 0;
    }) : [];

  const getTravelDays = () => {
    const plan = tripPlans?.find(p => String(p.wishId) === String(selectedWishId));
    if (plan) return plan.travelDays;
    return 3;
  };

  const getTravelers = () => {
    const wish = confirmedWishes.find(w => String(w.id) === selectedWishId);
    return wish?.travelers?.split(',').map(t => t.trim()).filter(t => t) || [];
  };

  const getActivityLocations = () => {
    if (!currentTripPlan) return [];
    const locations: Array<{ location: string; dayNumber: number; activityId: string; startTime: string; endTime?: string; type: string; date: string; content?: string }> = [];
    
    currentTripPlan.days.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.location) {
          let activityDate = '';
          if (currentTripPlan.startDate) {
            const start = new Date(currentTripPlan.startDate);
            start.setDate(start.getDate() + day.dayNumber - 1);
            activityDate = start.toISOString().split('T')[0];
          }
          
          locations.push({
            location: activity.location,
            dayNumber: day.dayNumber,
            activityId: activity.id,
            startTime: activity.startTime,
            endTime: activity.endTime,
            type: activity.type,
            date: activityDate,
            content: activity.content,
          });
        }
      });
    });
    
    return locations;
  };

  const getTransportLocations = () => {
    if (!currentTripPlan) return [];
    const locations: Array<{ location: string; dayNumber: number; activityId: string; startTime: string; endTime?: string; type: string; date: string; transportType?: string }> = [];
    
    currentTripPlan.days.forEach(day => {
      day.transport.forEach(transport => {
        if (transport.from && transport.to) {
          let transportDate = '';
          if (currentTripPlan.startDate) {
            const start = new Date(currentTripPlan.startDate);
            start.setDate(start.getDate() + day.dayNumber - 1);
            transportDate = start.toISOString().split('T')[0];
          }
          
          locations.push({
            location: `${transport.from}-${transport.to}`,
            dayNumber: day.dayNumber,
            activityId: transport.id,
            startTime: transport.departureTime || '',
            endTime: transport.arrivalTime,
            type: 'transportation',
            date: transportDate,
            transportType: transport.type,
          });
        }
      });
    });
    
    return locations;
  };

  const getFilteredLocations = () => {
    let locations;
    
    if (!newExpense.category) {
      locations = [...getActivityLocations(), ...getTransportLocations()];
    } else if (newExpense.category === 'transportation') {
      locations = getTransportLocations();
    } else {
      locations = getActivityLocations().filter(loc => loc.type === newExpense.category);
    }
    
    return locations.sort((a, b) => {
      const aDate = a.date ? new Date(a.date + 'T' + (a.startTime || '00:00')) : new Date(0);
      const bDate = b.date ? new Date(b.date + 'T' + (b.startTime || '00:00')) : new Date(0);
      return aDate.getTime() - bDate.getTime();
    });
  };

  const handleActivitySelect = (activity: typeof getActivityLocations extends () => infer R ? R extends Array<infer T> ? T : never : never) => {
    setSelectedActivity(activity);
    
    let description = '';
    const transportActivity = activity as { transportType?: string };
    if (activity.type === 'transportation') {
      const transportType = transportActivity.transportType;
      description = transportTypeMap[transportType || ''] || transportType || activity.location;
    } else {
      description = activity.content || `在 ${activity.location} 的活动`;
    }
    
    setNewExpense(prev => ({
      ...prev,
      location: activity.location,
      category: activity.type || prev.category,
      date: activity.date || prev.date,
      time: activity.startTime || prev.time,
      description: description,
    }));
  };

  const handleEditActivitySelect = (activity: typeof getActivityLocations extends () => infer R ? R extends Array<infer T> ? T : never : never) => {
    if (!editingExpense) return;
    
    setEditingSelectedActivity(activity);
    
    let description = '';
    const transportActivity = activity as { transportType?: string };
    if (activity.type === 'transportation') {
      const transportType = transportActivity.transportType;
      description = transportTypeMap[transportType || ''] || transportType || activity.location;
    } else {
      description = activity.content || `在 ${activity.location} 的活动`;
    }
    
    setEditingExpense({
      ...editingExpense,
      location: activity.location,
      category: (activity.type || editingExpense.category) as ExpenseCategory,
      date: activity.date || editingExpense.date,
      time: activity.startTime || editingExpense.time,
      description: description,
    });
  };

  const handlePayerToggle = (payer: string) => {
    setNewExpense(prev => ({
      ...prev,
      payers: prev.payers.includes(payer)
        ? prev.payers.filter(p => p !== payer)
        : [...prev.payers, payer]
    }));
  };

  if (!selectedWishId || showWishSelector) {
    return (
      <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-0">
        <div className="flex items-center mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-[#CEA472]">选择旅行</h3>
        </div>

        {confirmedWishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#FFFFFF]/60 text-xs">暂无已确认成行的愿望</div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {confirmedWishes.map(wish => {
              const hasRecord = tripExpenses.some(record => record.wishId === String(wish.id));
              const isDefault = defaultTripId === String(wish.id);
              return (
                <div
                  key={wish.id}
                  className={`bg-black/40 border rounded-lg p-3.5 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors ${isDefault ? 'border-[#CEA472]' : 'border-[#CEA472]/20'}`}
                  onClick={() => {
                    if (hasRecord) {
                      setSelectedWishId(String(wish.id));
                      setShowWishSelector(false);
                    } else {
                      createExpenseRecord(wish);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[#FFFFFF] font-medium text-xs truncate">{wish.destination}</h4>
                        {isDefault && <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472] fill-[#CEA472] flex-shrink-0" />}
                      </div>
                      <p className="text-[#FFFFFF]/60 text-xs mt-1">
                        {wish.confirmed_date} · {wish.travelers}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasRecord ? (
                        <span className="text-[#CEA472] text-xs">已有记录</span>
                      ) : (
                        <span className="text-[#FFFFFF]/40 text-xs">点击创建记录</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newDefaultId = String(wish.id);
                          setDefaultTripId(newDefaultId);
                          fetch('/api/default-trip', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ wishId: newDefaultId }),
                          });
                          window.dispatchEvent(new CustomEvent('default-trip-changed', { 
                            detail: { defaultTripId: newDefaultId } 
                          }));
                        }}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isDefault ? 'text-[#CEA472] hover:bg-[#CEA472]/20' : 'text-[#FFFFFF]/40 hover:text-[#CEA472] hover:bg-[#CEA472]/10'}`}
                        title={isDefault ? '默认旅行' : '设为默认旅行'}
                      >
                        <Star className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isDefault ? 'fill-[#CEA472]' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const currentWish = confirmedWishes.find(wish => String(wish.id) === selectedWishId);
  const travelers = getTravelers();
  const filteredLocations = getFilteredLocations();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-[#CEA472] truncate">
            {currentWish?.destination} 旅行记账
          </h2>
          {defaultTripId === selectedWishId && <Star className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#CEA472] fill-[#CEA472] flex-shrink-0" />}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowWishSelector(true)}
          className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent"
          title="切换旅行"
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>

      <div 
        className={`mb-4 p-3.5 sm:p-4 bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg ${isAdminMode ? 'cursor-pointer hover:bg-black/50 transition-colors' : ''}`}
        onClick={() => {
          if (isAdminMode && onEditTripInfo && currentWish) {
            onEditTripInfo({
              id: String(selectedWishId),
              confirmed_date: currentWish.confirmed_date,
              travelDays: getTravelDays(),
              travelers: currentWish.travelers,
              destination: currentWish.destination,
            });
          }
        }}
      >
        <div className="px-1">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-[#FFFFFF] font-medium text-xs">{currentWish?.destination}</h4>
              <p className="text-[#FFFFFF]/60 text-xs mt-0.5">{getTravelDays()}天 · {currentWish?.travelers}</p>
            </div>
            {isAdminMode && <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472] flex-shrink-0 mt-0.5" />}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-sm border border-[#CEA472]/20 rounded-lg p-1 gap-1 h-[48px] sm:h-[44px]">
          <TabsTrigger 
            value="entry"
            className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300 h-full flex items-center justify-center text-xs"
          >
            消费录入
          </TabsTrigger>
          <TabsTrigger 
            value="query"
            className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300 h-full flex items-center justify-center text-xs"
          >
            消费查询
          </TabsTrigger>
          <TabsTrigger 
            value="analysis"
            className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300 h-full flex items-center justify-center text-xs"
          >
            消费分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  {expenseCategoryIcons[newExpense.category] || expenseCategoryIcons.other}
                  <span className="text-[#CEA472] font-medium text-xs">{expenseCategories[newExpense.category] || '其他'}</span>
                </div>

                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">活动类型</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(expenseCategories).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setNewExpense({ ...newExpense, category: key })}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-xs ${
                          newExpense.category === key
                            ? 'border-[#CEA472] bg-[#CEA472]/10 text-[#CEA472]'
                            : 'border-[#CEA472]/20 bg-black/40 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        {expenseCategoryIcons[key]}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">活动地点</Label>
                  {filteredLocations.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-[#FFFFFF]/40 mb-2">从行程中选择（已按类型筛选）：</div>
                      <div className="flex flex-wrap gap-2">
                        {filteredLocations.map((activity, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleActivitySelect(activity)}
                            className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                              selectedActivity?.activityId === activity.activityId
                                ? 'bg-[#CEA472] text-[#0a0a0f]'
                                : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                            }`}
                          >
                            {activity.location}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Input
                    value={newExpense.location}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, location: e.target.value });
                      setSelectedActivity(null);
                    }}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                    placeholder="或直接输入地点"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                        <div>
                          <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">日期</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{4}-\d{2}-\d{2}"
                            placeholder="YYYY-MM-DD"
                            value={newExpense.date}
                            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">时间</Label>
                          <Input
                            type="time"
                            value={newExpense.time}
                            onChange={(e) => setNewExpense({ ...newExpense, time: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">消费金额</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">消费描述</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                    placeholder="输入消费描述"
                  />
                </div>

                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">消费人</Label>
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePayerToggle(traveler)}
                        className={`px-4 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[80px] ${
                          newExpense.payers.includes(traveler)
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">支付人</Label>
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewExpense({ ...newExpense, payer: traveler })}
                        className={`px-4 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[80px] ${
                          newExpense.payer === traveler
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
          </div>
          <div className="mt-4 px-2.5 sm:px-0">
            <Button
              onClick={addExpense}
              disabled={!newExpense.amount || !newExpense.date || (!newExpense.payers || newExpense.payers.length === 0) || !newExpense.payer}
              className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 min-h-[48px]"
            >
              保存消费
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="query" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
              {currentExpenseRecord && sortedExpenses.length > 0 ? (
                <div className="space-y-3 sm:space-y-3">
                  {sortedExpenses.map(expense => {
                    const payerCount = expense.payers?.length || 1;
                    const perPersonAmount = expense.amount / payerCount;
                    return (
                      <div
                        key={expense.id}
                        className="p-3.5 sm:p-4 rounded-lg bg-black/40 border border-[#CEA472]/20 hover:bg-black/70 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="text-xl sm:text-2xl text-[#FFFFFF] flex-shrink-0 pt-0.5">
                            {expenseCategoryIcons[expense.category] || expenseCategoryIcons.other}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4">
                              {/* 左侧内容 */}
                              <div className="sm:col-span-8">
                                {/* 第一行 */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[#CEA472] font-medium text-xs whitespace-nowrap">{expenseCategories[expense.category] || expense.category}</span>
                                  <span className="text-[#FFFFFF]/60 text-xs whitespace-nowrap">{expense.date} {expense.time || ''}</span>
                                </div>
                                {/* 第二行 */}
                                <div className="mt-1.5">
                                  <span className="text-[#FFFFFF] text-xs">{expense.location || ''}</span>
                                  {expense.location && expense.description && <span className="text-[#FFFFFF]/40 text-xs">·</span>}
                                  <span className="text-[#FFFFFF] text-xs">{expense.description || ''}</span>
                                </div>
                                {/* 第三行 */}
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span className="text-[#FFFFFF]/60 text-xs">消费人：</span>
                                  <span className="text-[#FFFFFF] text-xs">{expense.payers ? expense.payers.join('、') : '未记录'}</span>
                                </div>
                                {/* 第四行 */}
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-[#FFFFFF]/60 text-xs">支付人：</span>
                                  <span className="text-[#FFFFFF] text-xs">{expense.payer || '未记录'}</span>
                                </div>
                              </div>
                              {/* 右侧金额 */}
                              <div className="sm:col-span-4 text-left sm:text-right">
                                {/* 总金额 */}
                                <div className="flex items-center justify-start sm:justify-end gap-1">
                                  <span className="text-[#FFFFFF]/60 text-xs">总金额：</span>
                                  <span className="text-[#CEA472] font-semibold text-xs">¥{expense.amount.toFixed(2)}</span>
                                </div>
                                {/* 人均金额 */}
                                <div className="mt-1 flex items-center justify-start sm:justify-end gap-1">
                                  <span className="text-[#FFFFFF]/60 text-xs">人均金额：</span>
                                  <span className="text-[#CEA472] font-semibold text-xs">¥{perPersonAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isAdminMode && (
                          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#CEA472]/20">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingExpense(expense);
                                setShowEditExpense(true);
                              }}
                              className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDeletingExpenseId(expense.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-500 hover:text-red-500 hover:bg-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-[#CEA472]/40 mx-auto mb-4" />
                  <p className="text-[#FFFFFF]/60 text-xs">暂无支出记录</p>
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <div className="text-xs text-[#FFFFFF]/40 mb-2">全局筛选消费人：</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAnalysisConsumerFilter(null)}
                      className={`px-3 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[60px] ${
                        analysisConsumerFilter === null
                          ? 'bg-[#CEA472] text-[#0a0a0f]'
                          : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                      }`}
                    >
                      全部
                    </button>
                    {travelers.map((traveler) => (
                      <button
                        key={traveler}
                        onClick={() => setAnalysisConsumerFilter(traveler)}
                        className={`px-3 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[60px] ${
                          analysisConsumerFilter === traveler
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[#FFFFFF] font-medium mb-3 text-xs">按类别统计</h4>
                  <div className="space-y-2">
                    {Object.entries(filteredStats.categories).map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between p-3 sm:p-3 bg-black/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          {expenseCategoryIcons[category]}
                          <span className="text-[#FFFFFF] text-xs">{expenseCategories[category] || category}</span>
                        </div>
                        <div className="text-[#CEA472] font-medium text-xs">¥{amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {Object.keys(filteredStats.byPayer).length > 0 && (
                  <div>
                    <h4 className="text-[#FFFFFF] font-medium mb-3 text-xs">按支付人统计</h4>
                    <div className="space-y-2">
                      {Object.entries(filteredStats.byPayer).map(([payer, amount]) => (
                        <div key={payer} className="flex items-center justify-between p-3 sm:p-3 bg-black/40 rounded-lg">
                          <span className="text-[#FFFFFF] text-xs">{payer}</span>
                          <span className="text-[#CEA472] font-medium text-xs">¥{amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[#FFFFFF] font-medium mb-3 text-xs">收支结算</h4>
                  <div className="space-y-2">
                    {travelers
                      .filter(traveler => !analysisConsumerFilter || traveler === analysisConsumerFilter)
                      .map((traveler) => {
                        const paid = stats.byPayer[traveler] || 0;
                        const consumed = stats.byConsumer[traveler] || 0;
                        const difference = paid - consumed;
                        return (
                          <div key={traveler} className="p-3 sm:p-3 bg-black/40 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#FFFFFF] text-xs">{traveler}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#FFFFFF]/60 text-xs">支付: ¥{paid.toFixed(2)}</span>
                              <span className="text-[#FFFFFF]/60 text-xs">消费: ¥{consumed.toFixed(2)}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#CEA472]/20">
                              <div className="flex items-center justify-between">
                                <span className="text-[#FFFFFF]/60 text-xs">结算</span>
                                <span className={`font-medium text-xs ${difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-[#CEA472]'}`}>
                                  {difference > 0 
                                    ? `应收 ¥${difference.toFixed(2)}` 
                                    : difference < 0 
                                      ? `应付 ¥${Math.abs(difference).toFixed(2)}` 
                                      : '已平账'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑支出</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">日期</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">时间</Label>
                <Input
                  type="time"
                  value={editingExpense.time || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, time: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">类别</Label>
                <Select
                  value={editingExpense.category}
                  onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value as ExpenseCategory })}
                >
                  <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                    {Object.entries(expenseCategories).map(([category, name]) => (
                      <SelectItem key={category} value={category}>
                        {expenseCategoryIcons[category]} {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">金额</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(editingExpense.amount)}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">描述</Label>
                <Input
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">活动地点</Label>
                {(() => {
                  const editFilteredLocations = currentTripPlan
                    ? [...getActivityLocations(), ...getTransportLocations()].filter(loc => 
                        loc.type === editingExpense.category
                      )
                    : [];
                  
                  return (
                    <>
                      {editFilteredLocations.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-[#FFFFFF]/40 mb-2">从行程中选择（已按类型筛选）：</div>
                          <div className="flex flex-wrap gap-2">
                            {editFilteredLocations.map((activity, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleEditActivitySelect(activity)}
                                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                                  editingSelectedActivity?.activityId === activity.activityId
                                    ? 'bg-[#CEA472] text-[#0a0a0f]'
                                    : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                                }`}
                              >
                                {activity.location}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <Input
                        value={editingExpense.location || ''}
                        onChange={(e) => {
                          setEditingExpense({ ...editingExpense, location: e.target.value });
                          setEditingSelectedActivity(null);
                        }}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                        placeholder="或直接输入地点"
                      />
                    </>
                  );
                })()}
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">消费人</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {travelers.map((traveler, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const currentPayers = editingExpense.payers || [];
                        const newPayers = currentPayers.includes(traveler)
                          ? currentPayers.filter(p => p !== traveler)
                          : [...currentPayers, traveler];
                        setEditingExpense({ ...editingExpense, payers: newPayers });
                      }}
                      className={`px-4 py-2 rounded-full text-xs transition-all ${
                        (editingExpense.payers || []).includes(traveler)
                          ? 'bg-[#CEA472] text-[#0a0a0f]'
                          : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                      }`}
                    >
                      {traveler}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">支付人</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {travelers.map((traveler, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEditingExpense({ ...editingExpense, payer: traveler })}
                      className={`px-4 py-2 rounded-full text-xs transition-all ${
                        editingExpense.payer === traveler
                          ? 'bg-[#CEA472] text-[#0a0a0f]'
                          : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                      }`}
                    >
                      {traveler}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditExpense(false);
                setEditingExpense(null);
                setEditingSelectedActivity(null);
              }}
              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={saveEditedExpense}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">删除支出</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">
              确定要删除这条支出记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingExpenseId(null);
              }}
              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={deleteExpense}
              className="bg-red-500 text-white hover:bg-red-500/80"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWishSelector} onOpenChange={setShowWishSelector}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">选择旅行</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-80 overflow-y-auto">
            {confirmedWishes.map(wish => {
              const existingRecord = tripExpenses.find(record => record.wishId === String(wish.id));
              const isDefault = defaultTripId === String(wish.id);
              return (
                <div key={wish.id}>
                  <button
                    onClick={() => {
                      if (existingRecord) {
                        setSelectedWishId(String(wish.id));
                        setShowWishSelector(false);
                      } else {
                        createExpenseRecord(wish);
                      }
                    }}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      String(wish.id) === selectedWishId
                        ? 'bg-[#CEA472]/10 border border-[#CEA472] text-[#CEA472]'
                        : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF] hover:bg-black/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {wish.destination}
                          {isDefault && <Star className="w-4 h-4 fill-[#CEA472]" />}
                        </div>
                        <div className="text-xs text-[#FFFFFF]/60 mt-1">
                          {wish.confirmed_date ? `${wish.confirmed_date} · ` : ''}{wish.travelers}
                        </div>
                        {!existingRecord && (
                          <div className="text-xs text-[#CEA472]/80 mt-1">点击创建账单记录</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newDefaultId = String(wish.id);
                          setDefaultTripId(newDefaultId);
                          // 保存到数据库
                          fetch('/api/default-trip', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ wishId: newDefaultId }),
                          });
                          // 触发自定义事件，通知其他组件
                          window.dispatchEvent(new CustomEvent('default-trip-changed', { 
                            detail: { defaultTripId: newDefaultId } 
                          }));
                        }}
                        className={`p-1 hover:bg-[#CEA472]/20 rounded transition-colors ${isDefault ? 'text-[#CEA472]' : 'text-[#FFFFFF]/40 hover:text-[#CEA472]'}`}
                        title={isDefault ? '默认旅行' : '设为默认旅行'}
                      >
                        <Star className={`w-5 h-5 ${isDefault ? 'fill-[#CEA472]' : ''}`} />
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWishSelector(false)}
              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
