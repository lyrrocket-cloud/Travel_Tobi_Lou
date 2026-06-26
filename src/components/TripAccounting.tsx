'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, RefreshCw, Coins, Receipt, Car, BedDouble, MapPin, ShoppingBag, Gamepad2, Clock, Plane, Train, Bus, Save, UtensilsCrossed, ChevronDown, ChevronUp, X, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wish, TripExpenseRecord, ExpenseItem, ExpenseCategory, CurrencyCode, ExchangeRateRecord } from '@/types';
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

const currencyNames: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  GBP: '英镑',
  JPY: '日元',
  KRW: '韩元',
  HKD: '港币',
  TWD: '新台币',
  THB: '泰铢',
  SGD: '新加坡元',
  MYR: '马来西亚林吉特',
  VND: '越南盾',
};

const currencySymbols: Record<CurrencyCode, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  KRW: '₩',
  HKD: 'HK$',
  TWD: 'NT$',
  THB: '฿',
  SGD: 'S$',
  MYR: 'RM',
  VND: '₫',
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
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    CNY: 1,
    USD: 7.2,
    EUR: 7.8,
    GBP: 9.0,
    JPY: 0.048,
    KRW: 0.0052,
    HKD: 0.92,
    TWD: 0.22,
    THB: 0.20,
    SGD: 5.3,
    MYR: 1.55,
    VND: 0.00029,
  });
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(['USD', 'EUR', 'GBP', 'JPY', 'KRW']);
  const [currencyMeta, setCurrencyMeta] = useState<Record<string, { baseCode: CurrencyCode; note?: string }>>({});
  const [editingActiveCurrencies, setEditingActiveCurrencies] = useState<string[]>([]);
  const [editingCurrencyMeta, setEditingCurrencyMeta] = useState<Record<string, { baseCode: CurrencyCode; note?: string }>>({});
  const [newCurrencyBaseCode, setNewCurrencyBaseCode] = useState<CurrencyCode | ''>('');
  const [newCurrencyNote, setNewCurrencyNote] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState<string>('');
  
  const [newExpense, setNewExpense] = useState<{
    date: string;
    time: string;
    category: string;
    amount: string;
    currency: string;
    description: string;
    location: string;
    payers: string[];
    payer: string | null;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    category: 'other',
    amount: '',
    currency: 'CNY',
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
  
  // 消费查询筛选状态
  const [queryFilters, setQueryFilters] = useState<{
    category: string | null;
    payer: string | null;     // 支付人
    currency: string | null;
    dateFrom: string;
    dateTo: string;
  }>({
    category: null,
    payer: null,
    currency: null,
    dateFrom: '',
    dateTo: '',
  });
  
  // 消费查询筛选区域折叠状态
  const [queryFiltersCollapsed, setQueryFiltersCollapsed] = useState(true);
  
  const [showExchangeRateEditor, setShowExchangeRateEditor] = useState(false);
  const [editingExchangeRates, setEditingExchangeRates] = useState<Record<string, number>>(exchangeRates);

  const getCurrencyBaseCode = (currencyId: string): CurrencyCode => {
    const meta = currencyMeta[currencyId];
    if (meta) return meta.baseCode;
    if (currencyId in currencyNames) return currencyId as CurrencyCode;
    return 'CNY';
  };

  const getCurrencyNote = (currencyId: string): string | undefined => {
    return currencyMeta[currencyId]?.note;
  };

  const getCurrencySymbol = (currencyId: string): string => {
    const baseCode = getCurrencyBaseCode(currencyId);
    return currencySymbols[baseCode] || currencyId;
  };

  const getCurrencyName = (currencyId: string): string => {
    const baseCode = getCurrencyBaseCode(currencyId);
    const note = getCurrencyNote(currencyId);
    const baseName = currencyNames[baseCode] || baseCode;
    return note ? `${baseName}（${note}）` : baseName;
  };

  const getEditingCurrencySymbol = (currencyId: string): string => {
    const meta = editingCurrencyMeta[currencyId];
    const baseCode = meta ? meta.baseCode : (currencyId in currencyNames ? currencyId as CurrencyCode : 'CNY');
    return currencySymbols[baseCode] || currencyId;
  };

  const getEditingCurrencyName = (currencyId: string): string => {
    const meta = editingCurrencyMeta[currencyId];
    const baseCode = meta ? meta.baseCode : (currencyId in currencyNames ? currencyId as CurrencyCode : 'CNY');
    const note = meta?.note;
    const baseName = currencyNames[baseCode] || baseCode;
    return note ? `${baseName}（${note}）` : baseName;
  };

  const saveExchangeRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: editingExchangeRates,
          activeCurrencies: editingActiveCurrencies,
          currencyMeta: editingCurrencyMeta,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rates) {
          const ratesMap: Record<string, number> = {};
          data.rates.forEach((record: any) => {
            ratesMap[record.code] = record.rate;
          });
          setExchangeRates(ratesMap);
        }
        if (data.activeCurrencies) {
          setActiveCurrencies(data.activeCurrencies);
        }
        if (data.currencyMeta) {
          setCurrencyMeta(data.currencyMeta);
        }
        setShowExchangeRateEditor(false);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error saving exchange rates:', error);
    }
  };

  const currentExpenseRecord = selectedWishId ? 
    tripExpenses.find(record => String(record.wishId) === String(selectedWishId)) : null;

  const currentTripPlan = selectedWishId ?
    tripPlans.find(p => String(p.wishId) === String(selectedWishId)) : null;

  // 判断当前行程是否冻结（冻结的行程不可修改）
  const isCurrentTripFrozen = !!currentTripPlan?.frozen;

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

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates');
      const data = await response.json();
      if (data.rates) {
        const ratesMap: Record<string, number> = {};
        data.rates.forEach((record: any) => {
          ratesMap[record.code] = record.rate;
        });
        setExchangeRates(ratesMap);
      }
      if (data.activeCurrencies) {
        setActiveCurrencies(data.activeCurrencies);
      }
      if (data.currencyMeta) {
        setCurrencyMeta(data.currencyMeta);
      }
    } catch (error) {
      console.error('[Trip Accounting] Error fetching exchange rates:', error);
    }
  };

  const convertToCNY = (amount: number, currency?: string): number => {
    return amount * (exchangeRates[currency || 'CNY'] || 1);
  };

  useEffect(() => {
    // 读取保存的选中愿望ID（与 TripPlanner 共享，保留上一次的行程）
    const savedWishId = localStorage.getItem('travel-toolbox-selected-wish-id');
    
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
        // 如果有保存的愿望ID，使用它（包括刷新页面）
        if (savedWishId) {
          setSelectedWishId(savedWishId);
        }
        setInitializedFromStorage(true);
      }
    };
    
    fetchDefaultTrip();
  }, []);

  // 保存选中的旅行到 localStorage（与 TripPlanner 共享）
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
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
      fetchTripPlans(),
      fetchExchangeRates(),
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
      currency: newExpense.currency,
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
          currency: 'CNY',
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
      const convertedAmount = convertToCNY(expense.amount, expense.currency);
      stats.total += convertedAmount;
      stats.categories[expense.category] = (stats.categories[expense.category] || 0) + convertedAmount;
      if (expense.payer) {
        stats.byPayer[expense.payer] = (stats.byPayer[expense.payer] || 0) + convertedAmount;
      }
      if (expense.payers && expense.payers.length > 0) {
        const perPersonAmount = convertedAmount / expense.payers.length;
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
        const convertedAmount = convertToCNY(expense.amount, expense.currency);
        const perPersonAmount = convertedAmount / expense.payers.length;
        filtered.total += perPersonAmount;
        filtered.categories[expense.category] = (filtered.categories[expense.category] || 0) + perPersonAmount;
      }
    });

    // 处理按支付人的统计（只包含筛选出行人作为支付人的完整金额）
    currentExpenseRecord.expenses.forEach(expense => {
      if (expense.payer === analysisConsumerFilter) {
        filtered.byPayer[expense.payer] = (filtered.byPayer[expense.payer] || 0) + convertToCNY(expense.amount, expense.currency);
      }
    });

    if (analysisConsumerFilter) {
      filtered.byConsumer[analysisConsumerFilter] = filtered.total;
    }

    return filtered;
  };

  const filteredStats = calculateFilteredStats();

  // 消费查询筛选后的消费记录
  const filteredQueryExpenses = currentExpenseRecord
    ? currentExpenseRecord.expenses.filter(expense => {
        // 类别筛选
        if (queryFilters.category && expense.category !== queryFilters.category) {
          return false;
        }
        // 支付人筛选
        if (queryFilters.payer && expense.payer !== queryFilters.payer) {
          return false;
        }
        // 货币筛选
        if (queryFilters.currency && expense.currency !== queryFilters.currency) {
          return false;
        }
        // 日期范围筛选
        if (queryFilters.dateFrom && expense.date < queryFilters.dateFrom) {
          return false;
        }
        if (queryFilters.dateTo && expense.date > queryFilters.dateTo) {
          return false;
        }
        return true;
      })
    : [];

  const sortedExpenses = filteredQueryExpenses.sort((a, b) => {
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
  });

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

  if (!selectedWishId) {
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
            {showWishSelector ? '选择旅行' : showExchangeRateEditor ? '汇率管理' : `${currentWish?.destination} 旅行记账`}
          </h2>
          {currentTripPlan?.frozen && !showWishSelector && !showExchangeRateEditor && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-[10px] text-blue-400 flex-shrink-0">
              <Snowflake className="w-3 h-3" />
              已冻结
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 汇率管理按钮 - 始终显示 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (showExchangeRateEditor) {
                setShowExchangeRateEditor(false);
              } else {
                setEditingExchangeRates(exchangeRates);
                setEditingActiveCurrencies(activeCurrencies);
                setEditingCurrencyMeta(currencyMeta);
                setNewCurrencyBaseCode('');
                setNewCurrencyNote('');
                setNewCurrencyRate('');
                setShowExchangeRateEditor(true);
                setShowWishSelector(false);
              }
            }}
            className={showExchangeRateEditor ? 'bg-[#CEA472] text-[#0a0a0f]' : 'text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent'}
            title={showExchangeRateEditor ? '退出汇率管理' : '汇率管理'}
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          {/* 切换旅行按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowWishSelector(!showWishSelector)}
            className={showWishSelector ? 'bg-[#CEA472] text-[#0a0a0f]' : 'text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent'}
            title="切换旅行"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      <div 
        className={`mb-4 p-3.5 sm:p-4 bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg ${isAdminMode && !isCurrentTripFrozen ? 'cursor-pointer hover:bg-black/50 transition-colors' : ''}`}
        onClick={() => {
          if (isAdminMode && !isCurrentTripFrozen && onEditTripInfo && currentWish) {
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
              <div className="flex items-center gap-1.5">
                <h4 className="text-[#FFFFFF] font-medium text-xs">{currentWish?.destination}</h4>
                {currentTripPlan?.frozen && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-[10px] text-blue-400">
                    <Snowflake className="w-2.5 h-2.5" />
                    已冻结
                  </span>
                )}
              </div>
              <p className="text-[#FFFFFF]/60 text-xs mt-0.5">{getTravelDays()}天 · {currentWish?.travelers}</p>
            </div>
            {isAdminMode && !isCurrentTripFrozen && <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472] flex-shrink-0 mt-0.5" />}
          </div>
        </div>
      </div>

      {showWishSelector && (
        <div className="p-4 bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg">
          <div className="space-y-3">
            {confirmedWishes.map(wish => {
              const existingRecord = tripExpenses.find(record => record.wishId === String(wish.id));
              const isSelected = String(wish.id) === String(selectedWishId);
              return (
                <button
                  key={wish.id}
                  onClick={() => {
                    if (existingRecord) {
                      setSelectedWishId(String(wish.id));
                      setShowWishSelector(false);
                    } else {
                      createExpenseRecord(wish);
                    }
                  }}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-[#CEA472]/10 border border-[#CEA472] text-[#CEA472]'
                      : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF] hover:bg-black/70'
                  }`}
                >
                  <div className="font-medium text-sm">{wish.destination}</div>
                  <div className="text-xs text-[#FFFFFF]/60 mt-1">
                    {wish.confirmed_date ? `${wish.confirmed_date} · ` : ''}{wish.travelers}
                  </div>
                  {!existingRecord && (
                    <div className="text-xs text-[#CEA472]/80 mt-1">点击创建账单记录</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className={`w-full ${showWishSelector || showExchangeRateEditor ? 'hidden' : ''}`}>
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
          {isCurrentTripFrozen && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
              <span className="text-blue-400 text-xs">此行程已冻结，无法添加或修改消费记录</span>
            </div>
          )}
          <div className={`bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6 ${isCurrentTripFrozen ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">行程信息</Label>
                  
                  {/* 从旅行规划中选择活动 */}
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">从旅行规划选择活动行程</Label>
                    <Select
                      value={selectedActivity?.activityId || ''}
                      onValueChange={(value) => {
                        if (value) {
                          const activity = filteredLocations.find(l => l.activityId === value);
                          if (activity) {
                            handleActivitySelect(activity);
                          }
                        } else {
                          setSelectedActivity(null);
                          setNewExpense(prev => ({ ...prev, location: '', category: 'other', date: new Date().toISOString().split('T')[0], time: '12:00', description: '' }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full">
                        <SelectValue placeholder="选择活动行程" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                        {filteredLocations.map((activity, idx) => (
                          <SelectItem key={idx} value={activity.activityId}>
                            Day{activity.dayNumber} - {activity.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">活动地点</Label>
                  <Input
                    value={newExpense.location}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, location: e.target.value });
                      setSelectedActivity(null);
                    }}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                    placeholder="输入活动地点"
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
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={newExpense.amount}
                              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs flex-1"
                              placeholder="0.00"
                            />
                            <Select
                              value={newExpense.currency}
                              onValueChange={(value) => setNewExpense({ ...newExpense, currency: value })}
                            >
                              <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                                <SelectItem key="CNY" value="CNY">
                                  {getCurrencySymbol('CNY')} CNY
                                </SelectItem>
                                {activeCurrencies.map((currencyId) => (
                                  <SelectItem key={currencyId} value={currencyId}>
                                    {getCurrencySymbol(currencyId)} {getCurrencyName(currencyId)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
          {isCurrentTripFrozen && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
              <span className="text-blue-400 text-xs">此行程已冻结，无法修改消费记录</span>
            </div>
          )}
          <div className={`bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6 ${isCurrentTripFrozen ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* 筛选结果统计 - 始终显示 */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs text-[#FFFFFF]/60">
                  共 <span className="text-[#CEA472]">{sortedExpenses.length}</span> 条记录
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {(() => {
                    // 计算各种货币的总额
                    const currencyTotals: Record<string, number> = {};
                    sortedExpenses.forEach(e => {
                      const currency = e.currency || 'CNY';
                      currencyTotals[currency] = (currencyTotals[currency] || 0) + e.amount;
                    });
                    
                    return (
                      <>
                        {/* 人民币合计 */}
                        <span className="text-xs text-[#FFFFFF]/60">
                          合计：<span className="text-[#CEA472] font-medium">¥{sortedExpenses.reduce((sum, e) => sum + convertToCNY(e.amount, e.currency), 0).toFixed(2)}</span>
                        </span>
                        {/* 其他货币合计 */}
                        {Object.entries(currencyTotals)
                          .filter(([currency]) => currency !== 'CNY')
                          .map(([currency, total]) => (
                            <span key={currency} className="text-xs text-[#FFFFFF]/60">
                              <span className="text-[#CEA472] font-medium">{getCurrencySymbol(currency)}{total.toFixed(2)}</span>
                            </span>
                          ))
                        }
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setQueryFiltersCollapsed(!queryFiltersCollapsed)}
                    className="p-1.5 rounded-md bg-black/40 border border-[#CEA472]/20 text-[#CEA472] hover:bg-[#CEA472]/10 transition-colors"
                    title={queryFiltersCollapsed ? '展开筛选' : '收起筛选'}
                  >
                    {queryFiltersCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* 筛选区域 - 可折叠 */}
              {!queryFiltersCollapsed && (
                <div className="mb-4 pb-4 border-b border-[#CEA472]/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#FFFFFF]/60 text-xs">筛选条件</span>
                    <button
                      onClick={() => setQueryFilters({
                        category: null,
                        payer: null,
                        currency: null,
                        dateFrom: '',
                        dateTo: '',
                      })}
                      className="p-1.5 rounded-md bg-black/40 border border-[#CEA472]/20 text-[#CEA472] hover:bg-[#CEA472]/10 transition-colors"
                      title="清除筛选"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* 类别筛选 */}
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">活动类型</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setQueryFilters({ ...queryFilters, category: null })}
                        className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                          queryFilters.category === null
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        全部
                      </button>
                      {Object.entries(expenseCategories).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setQueryFilters({ ...queryFilters, category: key })}
                          className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                            queryFilters.category === key
                              ? 'bg-[#CEA472] text-[#0a0a0f]'
                              : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 支付人筛选 */}
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">支付人</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setQueryFilters({ ...queryFilters, payer: null })}
                        className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                          queryFilters.payer === null
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        全部
                      </button>
                      {travelers.map((traveler) => (
                        <button
                          key={traveler}
                          onClick={() => setQueryFilters({ ...queryFilters, payer: traveler })}
                          className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                            queryFilters.payer === traveler
                              ? 'bg-[#CEA472] text-[#0a0a0f]'
                              : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                          }`}
                        >
                          {traveler}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 货币筛选 */}
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">货币种类</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setQueryFilters({ ...queryFilters, currency: null })}
                        className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                          queryFilters.currency === null
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        全部
                      </button>
                      {activeCurrencies.map((currencyId) => (
                        <button
                          key={currencyId}
                          onClick={() => setQueryFilters({ ...queryFilters, currency: currencyId })}
                          className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                            queryFilters.currency === currencyId
                              ? 'bg-[#CEA472] text-[#0a0a0f]'
                              : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                          }`}
                        >
                          {getCurrencySymbol(currencyId)} {getCurrencyName(currencyId)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 日期范围筛选 */}
                  <div className="mb-2">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">日期范围</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={queryFilters.dateFrom}
                        onChange={(e) => setQueryFilters({ ...queryFilters, dateFrom: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-9 w-auto flex-1"
                      />
                      <span className="text-[#FFFFFF]/40 text-xs">至</span>
                      <Input
                        type="date"
                        value={queryFilters.dateTo}
                        onChange={(e) => setQueryFilters({ ...queryFilters, dateTo: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-9 w-auto flex-1"
                      />
                    </div>
                  </div>
                </div>
              )}
              
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
                                  <span className="text-[#CEA472] font-semibold text-xs">
                                    {getCurrencySymbol(expense.currency || 'CNY')}{expense.amount.toFixed(2)}{expense.currency && expense.currency !== 'CNY' ? ` (¥${convertToCNY(expense.amount, expense.currency).toFixed(2)})` : ''}
                                  </span>
                                </div>
                                {/* 人均金额 */}
                                <div className="mt-1 flex items-center justify-start sm:justify-end gap-1">
                                  <span className="text-[#FFFFFF]/60 text-xs">人均金额：</span>
                                  <span className="text-[#CEA472] font-semibold text-xs">
                                    {getCurrencySymbol(expense.currency || 'CNY')}{(expense.amount / (expense.payers?.length || 1)).toFixed(2)}{expense.currency && expense.currency !== 'CNY' ? ` (¥${convertToCNY(expense.amount / (expense.payers?.length || 1), expense.currency).toFixed(2)})` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isAdminMode && !isCurrentTripFrozen && (
                          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#CEA472]/20">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                // 初始化 editingExpense，保留所有原始数据
                                const initializedExpense = {
                                  ...expense,
                                  currency: expense.currency ?? 'CNY',
                                  description: expense.description ?? '',
                                  location: expense.location ?? '',
                                  payers: expense.payers ?? [],
                                  payer: expense.payer ?? undefined,
                                };
                                setEditingExpense(initializedExpense);
                                
                                // 尝试根据已有的 location 找到对应的活动
                                if (initializedExpense.location && currentTripPlan) {
                                  const allLocations = [...getActivityLocations(), ...getTransportLocations()];
                                  const matchedActivity = allLocations.find(
                                    loc => loc.location === initializedExpense.location
                                  );
                                  setEditingSelectedActivity(matchedActivity ?? null);
                                } else {
                                  setEditingSelectedActivity(null);
                                }
                                
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
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20 max-h-[90vh] overflow-hidden flex flex-col sm:max-w-lg">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-[#FFFFFF]">编辑支出</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4 py-2 pr-1 overflow-y-auto flex-1 min-h-0 edit-expense-scroll">
              {/* 日期和时间 - 同一行 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">日期</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="YYYY-MM-DD"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">时间</Label>
                  <Input
                    type="time"
                    value={editingExpense.time || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, time: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              </div>
              
              {/* 类别 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">类别</Label>
                <Select
                  value={editingExpense.category}
                  onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value as ExpenseCategory })}
                >
                  <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full">
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
              
              {/* 金额和货币 - 同一行 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">金额</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(editingExpense.amount)}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 flex-1 min-w-0"
                  />
                  <Select
                    value={editingExpense.currency || 'CNY'}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, currency: value })}
                  >
                    <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-20 sm:w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                      <SelectItem key="CNY" value="CNY">
                        {getCurrencySymbol('CNY')} CNY
                      </SelectItem>
                      {activeCurrencies.map((currencyId) => (
                        <SelectItem key={currencyId} value={currencyId}>
                          {getCurrencySymbol(currencyId)} {getCurrencyName(currencyId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* 描述 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">描述/备注</Label>
                <Input
                  value={editingExpense.description || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  placeholder="输入描述或备注"
                />
              </div>
              
              {/* 活动地点 - 可输入也可选择 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">活动地点</Label>
                {/* 手工输入框 */}
                <Input
                  value={editingExpense.location || ''}
                  onChange={(e) => {
                    setEditingExpense({ ...editingExpense, location: e.target.value });
                    setEditingSelectedActivity(null);
                  }}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  placeholder="手工输入或从下方选择"
                />
                {/* 可选活动列表 */}
                {(() => {
                  const editFilteredLocations = currentTripPlan
                    ? [...getActivityLocations(), ...getTransportLocations()].filter(loc => 
                        loc.type === editingExpense.category
                      )
                    : [];
                  
                  if (editFilteredLocations.length === 0) return null;
                  
                  return (
                    <div className="mt-2">
                      <div className="text-[10px] text-[#FFFFFF]/40 mb-1.5">从行程中选择：</div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto edit-expense-scroll">
                        {editFilteredLocations.map((activity, idx) => {
                          const isSelected = editingSelectedActivity?.activityId === activity.activityId;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleEditActivitySelect(activity);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] transition-all whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#CEA472] text-[#0a0a0f]'
                                  : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40 hover:text-[#FFFFFF]/80'
                              }`}
                            >
                              Day{activity.dayNumber} · {activity.location}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* 消费人 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">消费人</Label>
                <div className="flex flex-wrap gap-1.5">
                  {travelers.map((traveler, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const currentPayers = editingExpense.payers || [];
                        const newPayers = currentPayers.includes(traveler)
                          ? currentPayers.filter(p => p !== traveler)
                          : [...currentPayers, traveler];
                        setEditingExpense({ ...editingExpense, payers: newPayers });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
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
              
              {/* 支付人 */}
              <div>
                <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">支付人</Label>
                <div className="flex flex-wrap gap-1.5">
                  {travelers.map((traveler, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingExpense({ ...editingExpense, payer: traveler })}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
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
          <DialogFooter className="flex-shrink-0 pt-3 pb-2 border-t border-[#CEA472]/20">
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditExpense(false);
                  setEditingExpense(null);
                  setEditingSelectedActivity(null);
                }}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10 h-10 px-4"
              >
                取消
              </Button>
              <Button
                onClick={saveEditedExpense}
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 h-10 px-4"
              >
                保存
              </Button>
            </div>
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

      {/* 汇率管理模式内容 */}
      {showExchangeRateEditor && (
        <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-[#CEA472]" />
              <span className="text-[#CEA472] font-medium text-xs">管理活跃货币和汇率设置</span>
            </div>

            {/* 活跃货币列表 */}
            <div>
              <div className="text-xs text-[#CEA472] mb-2 font-medium">活跃货币</div>
              <div className="space-y-2">
                {editingActiveCurrencies.map((currencyId) => (
                  <div key={currencyId} className="flex items-center justify-between gap-4 p-2 bg-black/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-[#CEA472] font-medium text-xs w-20">{getEditingCurrencySymbol(currencyId)}</span>
                      <span className="text-[#FFFFFF] text-xs">{getEditingCurrencyName(currencyId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={editingExchangeRates[currencyId] || 0}
                        onChange={(e) => setEditingExchangeRates({
                          ...editingExchangeRates,
                          [currencyId]: parseFloat(e.target.value) || 0
                        })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs w-28 h-8"
                      />
                      <span className="text-[#FFFFFF]/40 text-xs">CNY</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingActiveCurrencies(prev => prev.filter(c => c !== currencyId))}
                        className="text-red-500 hover:text-red-500 hover:bg-transparent h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 添加新货币 */}
            <div className="border-t border-[#CEA472]/20 pt-4">
              <div className="text-xs text-[#CEA472] mb-2 font-medium">添加货币</div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={newCurrencyBaseCode}
                  onValueChange={(value) => {
                    const code = value as CurrencyCode;
                    setNewCurrencyBaseCode(code);
                    if (exchangeRates[code] !== undefined) {
                      setNewCurrencyRate(String(exchangeRates[code]));
                    }
                  }}
                >
                  <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-8 w-32">
                    <SelectValue placeholder="选择货币" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                    {(Object.keys(currencyNames) as CurrencyCode[])
                      .map((code) => (
                        <SelectItem key={code} value={code}>
                          {currencySymbols[code]} {code}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newCurrencyNote}
                  onChange={(e) => setNewCurrencyNote(e.target.value)}
                  placeholder="备注（现金/信用卡等）"
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-8 w-32"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={newCurrencyRate}
                  onChange={(e) => setNewCurrencyRate(e.target.value)}
                  placeholder="汇率"
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-8 w-24"
                />
                <span className="text-[#FFFFFF]/40 text-xs">CNY</span>
                <Button
                  size="sm"
                  onClick={() => {
                    if (newCurrencyBaseCode && newCurrencyRate) {
                      const rate = parseFloat(newCurrencyRate);
                      if (rate > 0) {
                        const currencyId = newCurrencyNote
                          ? `${newCurrencyBaseCode}_${newCurrencyNote}`
                          : newCurrencyBaseCode;
                        if (!editingActiveCurrencies.includes(currencyId)) {
                          setEditingExchangeRates({
                            ...editingExchangeRates,
                            [currencyId]: rate,
                          });
                          setEditingActiveCurrencies(prev => [...prev, currencyId]);
                          if (newCurrencyNote) {
                            setEditingCurrencyMeta({
                              ...editingCurrencyMeta,
                              [currencyId]: {
                                baseCode: newCurrencyBaseCode,
                                note: newCurrencyNote,
                              },
                            });
                          }
                        }
                        setNewCurrencyBaseCode('');
                        setNewCurrencyNote('');
                        setNewCurrencyRate('');
                      }
                    }
                  }}
                  disabled={!newCurrencyBaseCode || !newCurrencyRate}
                  className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 h-8"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#CEA472]/20">
              <Button
                variant="outline"
                onClick={() => setShowExchangeRateEditor(false)}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
              >
                取消
              </Button>
              <Button
                onClick={saveExchangeRates}
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
