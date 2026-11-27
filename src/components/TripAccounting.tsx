'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Star, Receipt, Car, BedDouble, MapPin, ShoppingBag, Gamepad2, Clock, Plane, Train, Bus, Save, UtensilsCrossed, ChevronDown, ChevronUp, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTabTransition, TabSwitchSkeleton } from '@/components/motion/TabTransition';
import { Wish, TripExpenseRecord, ExpenseItem, ExpenseCategory, CurrencyCode, ExchangeRateRecord } from '@/types';
import { TripPlan } from '@/types';
import type { AccountQueryFilters } from '@/lib/url-state';
import { EMPTY_FILTERS, filtersEqual } from '@/lib/url-state';

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
  // 受控的子标签（entry/query/analysis），由页面级 URL 状态统一管理
  subTab?: string;
  onSubTabChange?: (tab: string) => void;
  // 受控的查询筛选条件（分享还原用），由页面级 URL 状态统一管理
  filters?: AccountQueryFilters | null;
  onFiltersChange?: (filters: AccountQueryFilters) => void;
}

const VALID_ACCOUNT_SUB = ['entry', 'query', 'analysis', 'rates'];

export default function TripAccounting({ confirmedWishes, isAdminMode = false, subTab, onSubTabChange, filters, onFiltersChange }: TripAccountingProps) {
  const [tripExpenses, setTripExpenses] = useState<TripExpenseRecord[]>([]);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  // 首次渲染即从 localStorage 恢复选中的旅行（该组件只在“旅行记账”标签激活时挂载），
  // 避免先渲染“选择旅行”界面、随后再跳回具体行程造成的闪烁
  const [selectedWishId, setSelectedWishId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('travel-toolbox-selected-wish-id');
  });
  const [showWishSelector, setShowWishSelector] = useState(false);
  // 受控的子标签：父组件（URL 状态）为单一事实来源；内部镜像避免被 localStorage 默认值覆盖
  const [internalTab, setInternalTab] = useState<string>(
    subTab && VALID_ACCOUNT_SUB.includes(subTab) ? subTab : 'entry'
  );
  const activeTab = internalTab;
  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    onSubTabChange?.(tab);
  };
  const tabTransition = useTabTransition();
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
  
  // 消费查询筛选状态：父组件（URL 状态）为单一事实来源；内部镜像用于分享还原，不被默认值覆盖
  const [internalFilters, setInternalFilters] = useState<AccountQueryFilters>(
    filters && !filtersEqual(filters, EMPTY_FILTERS) ? filters : EMPTY_FILTERS
  );
  const queryFilters = internalFilters;
  const setQueryFilters = (
    next: AccountQueryFilters | ((prev: AccountQueryFilters) => AccountQueryFilters)
  ) => {
    setInternalFilters(prev => {
      const resolved = typeof next === 'function' ? (next as (p: AccountQueryFilters) => AccountQueryFilters)(prev) : next;
      if (!filtersEqual(resolved, prev)) onFiltersChange?.(resolved);
      return resolved;
    });
  };
  
  // 消费查询筛选区域折叠状态
  const [queryFiltersCollapsed, setQueryFiltersCollapsed] = useState(true);

  // 消费查询按月分组的展开状态：仅默认展开最新一个月
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());
  const didSeedExpandedMonths = useRef(false);
  
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
    // 子标签由父组件（URL 状态）受控，不再从 localStorage 读取，避免覆盖 URL 还原
    // 读取保存的选中愿望ID（与 TripPlanner 共享，保留上一次的行程）
    const savedWishId = localStorage.getItem('travel-toolbox-selected-wish-id');

    // 同步恢复上次选中的旅行，不等待默认旅行接口返回
    if (savedWishId) {
      setSelectedWishId(savedWishId);
    }

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

  // 保存选中的旅行到 localStorage（与 TripPlanner 共享），并同步页面级头部
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
      window.dispatchEvent(new CustomEvent('selected-wish-changed', { detail: { wishId: selectedWishId } }));
    }
  }, [selectedWishId, initializedFromStorage]);

  // 监听外部（页面级切换旅行）的行程变化
  useEffect(() => {
    const handleSelectedWishChanged = (e: Event) => {
      const wishId = (e as CustomEvent).detail?.wishId;
      if (!wishId) return;
      setSelectedWishId(String(wishId));
      setShowWishSelector(false);
    };
    window.addEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    return () => {
      window.removeEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    };
  }, []);

  // 子标签持久化与 URL 同步由父组件统一管理；外部（URL 还原）切换时同步到内部
  useEffect(() => {
    if (subTab && VALID_ACCOUNT_SUB.includes(subTab) && subTab !== internalTab) {
      setInternalTab(subTab);
    }
  }, [subTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 进入「汇率管理」标签时，用当前汇率数据初始化草稿
  useEffect(() => {
    if (activeTab !== 'rates') return;
    setEditingExchangeRates(exchangeRates);
    setEditingActiveCurrencies(activeCurrencies);
    setEditingCurrencyMeta(currencyMeta);
    setNewCurrencyBaseCode('');
    setNewCurrencyNote('');
    setNewCurrencyRate('');
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 外部（URL 还原）筛选变化时同步到内部；空筛选等价于默认，不触发无意义更新
  useEffect(() => {
    const incoming = filters ?? EMPTY_FILTERS;
    if (!filtersEqual(incoming, internalFilters)) {
      setInternalFilters(incoming);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // 消费查询按月分组（仅用于展示；筛选与合计仍基于全部 sortedExpenses）
  type ExpenseMonthGroup = {
    key: string;
    label: string;
    items: ExpenseItem[];
    count: number;
    cnyTotal: number;
  };
  const expenseGroups: ExpenseMonthGroup[] = (() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const expense of sortedExpenses) {
      const key = (expense.date || '').slice(0, 7) || 'unknown';
      const list = map.get(key);
      if (list) list.push(expense);
      else map.set(key, [expense]);
    }
    const groups = Array.from(map.entries()).map(([key, items]) => {
      const cnyTotal = items.reduce((sum, e) => sum + convertToCNY(e.amount, e.currency), 0);
      const label = key === 'unknown'
        ? '未知日期'
        : `${key.slice(0, 4)}年${key.slice(5, 7)}月`;
      return { key, label, items, count: items.length, cnyTotal };
    });
    // sortedExpenses 按日期升序；反转使最新月份排在最前
    return groups.reverse();
  })();

  // 首次渲染时默认展开最新月份（render 中条件性 setState，React 在绘制前重渲染，无闪烁）
  if (!didSeedExpandedMonths.current && expenseGroups.length > 0) {
    didSeedExpandedMonths.current = true;
    setExpandedMonths(new Set([expenseGroups[0].key]));
  }

  const toggleExpenseMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  // 初始化或自动选中完成前先显示骨架，避免闪出“选择旅行”界面
  if (!selectedWishId && (!initializedFromStorage || loading || confirmedWishes.length > 0)) {
    return (
      <div className="relative w-full min-h-[400px]">
        <TabSwitchSkeleton />
      </div>
    );
  }

  if (!selectedWishId) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <h2 className="text-lg font-semibold text-[#CEA472]">选择旅行</h2>
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
                  className={`bg-black/40 backdrop-blur-sm rounded-none border-0 p-3.5 sm:p-4 cursor-pointer hover:bg-black/60 transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDefault ? '' : ''}`}
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
                        <h3 className="text-[#FFFFFF] font-medium text-xs truncate">{wish.destination}</h3>
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
      <Tabs value={activeTab} onValueChange={(v) => tabTransition.switchTo(v, () => setActiveTab(v))} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1 h-[48px] sm:h-[44px] bg-black/60 rounded-none p-0">
          <TabsTrigger 
            value="entry"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            消费录入
          </TabsTrigger>
          <TabsTrigger 
            value="query"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            消费查询
          </TabsTrigger>
          <TabsTrigger 
            value="analysis"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            消费总览
          </TabsTrigger>
          <TabsTrigger 
            value="rates"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            汇率管理
          </TabsTrigger>
        </TabsList>
        <div className={`relative ${showWishSelector || activeTab === 'rates' ? 'hidden' : ''}`}>
          <div className={tabTransition.contentClassName} style={{ opacity: tabTransition.contentOpacity }}>

        <TabsContent value="entry" className="mt-3">
          {isCurrentTripFrozen && (
            <div className="mb-4 p-3 bg-blue-500/10   rounded-none flex items-center gap-2">
              <span className="text-blue-400 text-xs">此行程已冻结，无法添加或修改消费记录</span>
            </div>
          )}
          <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">活动类型</Label>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {Object.entries(expenseCategories).map(([key, label]) => (
                      <button
                        key={key}
                        disabled={isCurrentTripFrozen}
                        aria-pressed={newExpense.category === key}
                        onClick={() => setNewExpense({ ...newExpense, category: key })}
                        className={`flex items-center gap-1.5 px-1.5 py-1 min-h-[44px] rounded-none  transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] text-xs ${
                          newExpense.category === key
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        {expenseCategoryIcons[key]}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">行程信息</Label>
                  
                  {/* 从旅行规划中选择活动 */}
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">从旅行规划选择活动行程</Label>
                    <Select
                      value={selectedActivity?.activityId || ''}
                      disabled={isCurrentTripFrozen}
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
                      <SelectTrigger aria-label="选择活动行程" className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full">
                        <SelectValue placeholder="选择活动行程" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f]  ">
                        {filteredLocations.map((activity, idx) => (
                          <SelectItem key={idx} value={activity.activityId}>
                            Day{activity.dayNumber} - {activity.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Label htmlFor="expense-location" className="text-[#CEA472] mb-2 block text-xs">活动地点</Label>
                  <Input
                    id="expense-location"
                    value={newExpense.location}
                    readOnly={isCurrentTripFrozen}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, location: e.target.value });
                      setSelectedActivity(null);
                    }}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                    placeholder="输入活动地点"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                        <div>
                          <Label htmlFor="expense-date" className="text-[#CEA472] mb-2 block text-xs">日期</Label>
                          <Input
                            id="expense-date"
                            type="text"
                            inputMode="numeric"
                            pattern="\d{4}-\d{2}-\d{2}"
                            placeholder="YYYY-MM-DD"
                            value={newExpense.date}
                            readOnly={isCurrentTripFrozen}
                            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                            className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expense-time" className="text-[#CEA472] mb-2 block text-xs">时间</Label>
                          <Input
                            id="expense-time"
                            type="time"
                            value={newExpense.time}
                            readOnly={isCurrentTripFrozen}
                            onChange={(e) => setNewExpense({ ...newExpense, time: e.target.value })}
                            className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expense-amount" className="text-[#CEA472] mb-2 block text-xs">消费金额</Label>
                          <div className="flex gap-2">
                            <Input
                              id="expense-amount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={newExpense.amount}
                              readOnly={isCurrentTripFrozen}
                              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                              className="bg-black/60   text-[#FFFFFF] text-xs flex-1"
                              placeholder="0.00"
                            />
                            <Select
                              value={newExpense.currency}
                              disabled={isCurrentTripFrozen}
                              onValueChange={(value) => setNewExpense({ ...newExpense, currency: value })}
                            >
                              <SelectTrigger aria-label="消费货币" className="bg-black/60   text-[#FFFFFF] text-xs w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a0a0f]  ">
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
                  <Label htmlFor="expense-desc" className="text-[#CEA472] mb-2 block text-xs">消费描述</Label>
                  <Input
                    id="expense-desc"
                    value={newExpense.description}
                    readOnly={isCurrentTripFrozen}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs"
                    placeholder="输入消费描述"
                  />
                </div>

                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">消费人</Label>
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        disabled={isCurrentTripFrozen}
                        aria-pressed={newExpense.payers.includes(traveler)}
                        onClick={() => handlePayerToggle(traveler)}
                        className={`px-4 py-2 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[80px] ${
                          newExpense.payers.includes(traveler)
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">支付人</Label>
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        disabled={isCurrentTripFrozen}
                        aria-pressed={newExpense.payer === traveler}
                        onClick={() => setNewExpense({ ...newExpense, payer: traveler })}
                        className={`px-4 py-2 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[80px] ${
                          newExpense.payer === traveler
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={addExpense}
              disabled={isCurrentTripFrozen || !newExpense.amount || !newExpense.date || (!newExpense.payers || newExpense.payers.length === 0) || !newExpense.payer}
              className="w-44 bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 min-h-[48px]"
            >
              保存消费
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="query" className="mt-3">
          {isCurrentTripFrozen && (
            <div className="mb-4 p-3 bg-blue-500/10   rounded-none flex items-center gap-2">
              <span className="text-blue-400 text-xs">此行程已冻结，无法修改消费记录</span>
            </div>
          )}
          <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
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
                        {/* 折算人民币合计：全部消费按当前汇率折算为 CNY（非各币种原币直接相加） */}
                        <span className="text-xs text-[#FFFFFF]/60">
                          折算人民币合计：<span className="text-[#CEA472] font-medium">¥{sortedExpenses.reduce((sum, e) => sum + convertToCNY(e.amount, e.currency), 0).toFixed(2)}</span>
                        </span>
                        {/* 各币种原币合计：按币种分别汇总，不跨币种相加 */}
                        {Object.entries(currencyTotals)
                          .filter(([currency]) => currency !== 'CNY')
                          .map(([currency, total]) => (
                            <span key={currency} className="text-xs text-[#FFFFFF]/60">
                              {getCurrencyName(currency)}合计：<span className="text-[#CEA472] font-medium">{getCurrencySymbol(currency)}{total.toFixed(2)}</span>
                            </span>
                          ))
                        }
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setQueryFiltersCollapsed(!queryFiltersCollapsed)}
                    className="p-1.5 rounded-none bg-black/60   text-[#CEA472] hover:bg-[#CEA472]/10 transition-colors"
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
                      className="p-1.5 rounded-none bg-black/60   text-[#CEA472] hover:bg-[#CEA472]/10 transition-colors"
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
                        className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          queryFilters.category === null
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        全部
                      </button>
                      <span aria-hidden="true" className="h-4 w-px self-center bg-[#CEA472]/40" />
                      {Object.entries(expenseCategories).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setQueryFilters({ ...queryFilters, category: key })}
                          className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            queryFilters.category === key
                              ? 'text-[#CEA472]'
                              : 'text-white/80 hover:text-[#CEA472]'
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
                        className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          queryFilters.payer === null
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        全部
                      </button>
                      {travelers.length > 0 && (
                        <span aria-hidden="true" className="h-4 w-px self-center bg-[#CEA472]/40" />
                      )}
                      {travelers.map((traveler) => (
                        <button
                          key={traveler}
                          onClick={() => setQueryFilters({ ...queryFilters, payer: traveler })}
                          className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            queryFilters.payer === traveler
                              ? 'text-[#CEA472]'
                              : 'text-white/80 hover:text-[#CEA472]'
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
                        className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          queryFilters.currency === null
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        全部
                      </button>
                      {activeCurrencies.length > 0 && (
                        <span aria-hidden="true" className="h-4 w-px self-center bg-[#CEA472]/40" />
                      )}
                      {activeCurrencies.map((currencyId) => (
                        <button
                          key={currencyId}
                          onClick={() => setQueryFilters({ ...queryFilters, currency: currencyId })}
                          className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            queryFilters.currency === currencyId
                              ? 'text-[#CEA472]'
                              : 'text-white/80 hover:text-[#CEA472]'
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
                        className="bg-black/60   text-[#FFFFFF] text-xs h-9 w-auto flex-1"
                      />
                      <span className="text-[#FFFFFF]/40 text-xs">至</span>
                      <Input
                        type="date"
                        value={queryFilters.dateTo}
                        onChange={(e) => setQueryFilters({ ...queryFilters, dateTo: e.target.value })}
                        className="bg-black/60   text-[#FFFFFF] text-xs h-9 w-auto flex-1"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {currentExpenseRecord && expenseGroups.length > 0 ? (
                <div className="space-y-4">
                  {expenseGroups.map(group => {
                    const expanded = expandedMonths.has(group.key);
                    return (
                      <div key={group.key} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleExpenseMonth(group.key)}
                          aria-expanded={expanded}
                          aria-controls={`expense-month-${group.key}`}
                          className="w-full flex items-center justify-between p-2.5 rounded-none bg-[#CEA472]/10 hover:bg-[#CEA472]/20 transition-colors text-left min-h-[44px]"
                        >
                          <span className="flex items-center gap-2 text-[#CEA472] text-xs font-medium">
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {group.label}
                            <span className="text-[#FFFFFF]/50">({group.count} 条)</span>
                          </span>
                          <span className="text-[#CEA472] text-xs font-medium">¥{group.cnyTotal.toFixed(2)}</span>
                        </button>
                        {expanded && (
                          <div id={`expense-month-${group.key}`} className="space-y-3 sm:space-y-3">
                            {group.items.map(expense => {
                              const payerCount = expense.payers?.length || 1;
                              const perPersonAmount = expense.amount / payerCount;
                              return (
                      <div
                        key={expense.id}
                        className="p-3.5 sm:p-4 rounded-none border-0 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
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

        <TabsContent value="analysis" className="mt-3">
          <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setAnalysisConsumerFilter(null)}
                      className={`px-3 py-2 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[60px] ${
                        analysisConsumerFilter === null
                          ? 'text-[#CEA472]'
                          : 'text-white/80 hover:text-[#CEA472]'
                      }`}
                    >
                      全部
                    </button>
                    {travelers.length > 0 && (
                      <span aria-hidden="true" className="h-4 w-px bg-[#CEA472]/40" />
                    )}
                    {travelers.map((traveler) => (
                      <button
                        key={traveler}
                        onClick={() => setAnalysisConsumerFilter(traveler)}
                        className={`px-3 py-2 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[60px] ${
                          analysisConsumerFilter === traveler
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                </div>

                {Object.keys(filteredStats.categories).length > 0 && (
                  <div>
                    <h3 className="text-[#CEA472] font-medium mb-3 text-xs">按类别统计</h3>
                    <div className="space-y-2">
                      {Object.entries(filteredStats.categories).map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between p-3 sm:p-3 bg-black/60 rounded-none">
                          <div className="flex items-center gap-3">
                            {expenseCategoryIcons[category]}
                            <span className="text-[#FFFFFF] text-xs">{expenseCategories[category] || category}</span>
                          </div>
                          <div className="text-[#CEA472] font-medium text-xs">¥{amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(filteredStats.byPayer).length > 0 && (
                  <div>
                    <h3 className="text-[#CEA472] font-medium mb-3 text-xs">按支付人统计</h3>
                    <div className="space-y-2">
                      {Object.entries(filteredStats.byPayer).map(([payer, amount]) => (
                        <div key={payer} className="flex items-center justify-between p-3 sm:p-3 bg-black/60 rounded-none">
                          <span className="text-[#FFFFFF] text-xs">{payer}</span>
                          <span className="text-[#CEA472] font-medium text-xs">¥{amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-[#CEA472] font-medium mb-3 text-xs">收支结算</h3>
                  <div className="space-y-2">
                    {travelers
                      .filter(traveler => !analysisConsumerFilter || traveler === analysisConsumerFilter)
                      .map((traveler) => {
                        const paid = stats.byPayer[traveler] || 0;
                        const consumed = stats.byConsumer[traveler] || 0;
                        const difference = paid - consumed;
                        return (
                          <div key={traveler} className="p-3 sm:p-3 bg-black/60 rounded-none">
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
          </div>
          {tabTransition.isLoading && <TabSwitchSkeleton />}
        </div>
      </Tabs>

      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="bg-[#0a0a0f]   max-h-[90vh] overflow-hidden flex flex-col sm:max-w-lg">
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
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-1.5 block text-xs">时间</Label>
                  <Input
                    type="time"
                    value={editingExpense.time || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, time: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
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
                  <SelectTrigger className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f]  ">
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
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10 flex-1 min-w-0"
                  />
                  <Select
                    value={editingExpense.currency || 'CNY'}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, currency: value })}
                  >
                    <SelectTrigger className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-20 sm:w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f]  ">
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
                  className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
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
                  className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
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
                      <div className="text-xs text-[#FFFFFF]/40 mb-1.5">从行程中选择：</div>
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
                              className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#CEA472] text-[#0a0a0f]'
                                  : 'bg-black/60   text-[#FFFFFF]/60  hover:text-[#FFFFFF]/80'
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
                      className={`px-3 py-1.5 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        (editingExpense.payers || []).includes(traveler)
                          ? 'bg-[#CEA472] text-[#0a0a0f]'
                          : 'bg-black/60   text-[#FFFFFF]/60 '
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
                      className={`px-3 py-1.5 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        editingExpense.payer === traveler
                          ? 'bg-[#CEA472] text-[#0a0a0f]'
                          : 'bg-black/60   text-[#FFFFFF]/60 '
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
                className="bg-black/60   text-[#FFFFFF] hover:bg-[#CEA472]/10 h-10 px-4"
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
        <DialogContent className="bg-[#0a0a0f]  ">
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
              className="bg-black/60   text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

      {/* 汇率管理标签内容 */}
      {activeTab === 'rates' && (
        <div className="mt-3 tab-section-in bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
          <div className="space-y-4">
            {/* 活跃货币列表 */}
            <div>
              <div className="text-xs text-[#CEA472] mb-2 font-medium">活跃货币</div>
              <div className="space-y-2">
                {editingActiveCurrencies.map((currencyId) => (
                  <div key={currencyId} className="flex items-center justify-between gap-4 p-2 bg-black/60 rounded-none">
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
                        className="bg-black/60   text-[#FFFFFF] text-xs w-28 h-8"
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
                  <SelectTrigger className="bg-black/60   text-[#FFFFFF] text-xs h-8 flex-1 basis-32 min-w-0">
                    <SelectValue placeholder="选择货币" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f]  ">
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
                  className="bg-black/60   text-[#FFFFFF] text-xs h-8 flex-1 basis-32 min-w-0"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={newCurrencyRate}
                  onChange={(e) => setNewCurrencyRate(e.target.value)}
                  placeholder="汇率"
                  className="bg-black/60   text-[#FFFFFF] text-xs h-8 flex-1 basis-32 min-w-0"
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
                  className="bg-transparent text-[#CEA472] hover:bg-transparent hover:text-[#CEA472]/80 disabled:opacity-50 h-8"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#CEA472]/20">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingExchangeRates(exchangeRates);
                  setEditingActiveCurrencies(activeCurrencies);
                  setEditingCurrencyMeta(currencyMeta);
                  setNewCurrencyBaseCode('');
                  setNewCurrencyNote('');
                  setNewCurrencyRate('');
                }}
                className="bg-transparent text-white/80 hover:bg-transparent hover:text-[#CEA472]"
              >
                取消
              </Button>
              <Button
                onClick={saveExchangeRates}
                className="bg-transparent text-[#CEA472] hover:bg-transparent hover:text-[#CEA472]/80"
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
