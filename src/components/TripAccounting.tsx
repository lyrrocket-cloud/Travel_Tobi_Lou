'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, RefreshCw, Coins, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Wish, TripExpenseRecord, ExpenseItem, ExpenseCategory } from '@/types';
import { TripPlan } from '@/types';

// 支出类别名称映射
const CATEGORY_NAMES: Record<ExpenseCategory, string> = {
  transportation: '交通',
  accommodation: '住宿',
  food: '餐饮',
  entertainment: '娱乐',
  shopping: '购物',
  attraction: '景点门票',
  other: '其他'
};

// 支出类别图标
const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  transportation: '🚗',
  accommodation: '🏨',
  food: '🍽️',
  entertainment: '🎮',
  shopping: '🛒',
  attraction: '🎫',
  other: '💰'
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
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializedFromStorage, setInitializedFromStorage] = useState(false);
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  
  // 新增支出表单数据
  const [newExpense, setNewExpense] = useState<{
    date: string;
    category: ExpenseCategory;
    amount: string;
    description: string;
    payer?: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    amount: '',
    description: '',
  });

  // 当前选中的账单记录
  const currentExpenseRecord = selectedWishId ? 
    tripExpenses.find(record => record.wishId === selectedWishId) : null;

  // 加载账单数据
  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/trip-expenses');
      const data = await response.json();
      setTripExpenses(data.tripExpenses || []);
    } catch (error) {
      console.error('[Trip Accounting] Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载旅行规划数据
  const fetchTripPlans = async () => {
    try {
      const response = await fetch('/api/trip-plans');
      const data = await response.json();
      setTripPlans(data.tripPlans || []);
    } catch (error) {
      console.error('[Trip Accounting] Error fetching trip plans:', error);
    }
  };

  // 初始化：从localStorage读取上次选择的旅行
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWishId = localStorage.getItem('travel-toolbox-accounting-wish-id');
      const savedDefaultId = localStorage.getItem('travel-toolbox-default-trip-id');
      
      if (savedWishId) {
        setSelectedWishId(savedWishId);
      }
      
      if (savedDefaultId) {
        setDefaultTripId(savedDefaultId);
      }
      
      setInitializedFromStorage(true);
    }
  }, []);

  // 保存选择的旅行到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage) {
      localStorage.setItem('travel-toolbox-accounting-wish-id', selectedWishId);
    }
  }, [selectedWishId, initializedFromStorage]);

  // 保存默认旅行到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && initializedFromStorage) {
      if (defaultTripId) {
        localStorage.setItem('travel-toolbox-default-trip-id', defaultTripId);
      } else {
        localStorage.removeItem('travel-toolbox-default-trip-id');
      }
    }
  }, [defaultTripId, initializedFromStorage]);

  // 初始加载数据
  useEffect(() => {
    Promise.all([
      fetchExpenses(),
      fetchTripPlans()
    ]);
  }, []);

  // 根据默认旅行选择逻辑
  useEffect(() => {
    if (!initializedFromStorage || loading) return;
    
    if (selectedWishId) {
      const wishExists = confirmedWishes.some(wish => String(wish.id) === selectedWishId);
      if (wishExists) {
        return;
      } else {
        localStorage.removeItem('travel-toolbox-accounting-wish-id');
        setSelectedWishId(null);
      }
    }
    
    if (defaultTripId) {
      const defaultWishExists = confirmedWishes.some(wish => String(wish.id) === defaultTripId);
      if (defaultWishExists) {
        setSelectedWishId(defaultTripId);
        return;
      } else {
        setDefaultTripId(null);
      }
    }
    
    if (confirmedWishes.length > 0) {
      setSelectedWishId(String(confirmedWishes[0].id));
    }
  }, [confirmedWishes, tripPlans, selectedWishId, initializedFromStorage, loading, defaultTripId]);

  // 创建账单记录
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

  // 添加支出
  const addExpense = async () => {
    if (!currentExpenseRecord || !newExpense.amount || !newExpense.description) {
      return;
    }

    const expenseItem: ExpenseItem = {
      id: `expense-${Date.now()}`,
      wishId: currentExpenseRecord.wishId,
      date: newExpense.date,
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      payer: newExpense.payer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/trip-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentExpenseRecord.id,
          expenses: [...currentExpenseRecord.expenses, expenseItem],
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        setShowAddExpense(false);
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          category: 'other',
          amount: '',
          description: '',
        });
      }
    } catch (error) {
      console.error('[Trip Accounting] Error adding expense:', error);
    }
  };

  // 保存编辑的支出
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
      }
    } catch (error) {
      console.error('[Trip Accounting] Error saving edited expense:', error);
    }
  };

  // 删除支出
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

  // 计算统计数据
  const calculateStats = () => {
    if (!currentExpenseRecord) return { total: 0, categories: {} as Record<ExpenseCategory, number> };

    const stats = {
      total: 0,
      categories: {
        transportation: 0,
        accommodation: 0,
        food: 0,
        entertainment: 0,
        shopping: 0,
        attraction: 0,
        other: 0,
      } as Record<ExpenseCategory, number>,
    };

    currentExpenseRecord.expenses.forEach(expense => {
      stats.total += expense.amount;
      stats.categories[expense.category] += expense.amount;
    });

    return stats;
  };

  const stats = calculateStats();

  // 排序支出（按日期降序）
  const sortedExpenses = currentExpenseRecord ? 
    [...currentExpenseRecord.expenses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) : [];

  // 如果没有选中的旅行，显示选择界面
  if (!selectedWishId || showWishSelector) {
    return (
      <div className="w-full">
        <div className="flex items-center mb-6">
          <h3 className="text-xl font-semibold text-[#CEA472]">选择旅行</h3>
        </div>

        {confirmedWishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#FFFFFF]/60">暂无已确认成行的愿望</div>
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedWishes.map(wish => {
              const hasRecord = tripExpenses.some(record => record.wishId === String(wish.id));
              const isDefault = defaultTripId === String(wish.id);
              return (
                <div
                  key={wish.id}
                  className={`bg-black/30 border rounded-lg p-4 cursor-pointer hover:bg-black/40 transition-colors ${isDefault ? 'border-[#CEA472]' : 'border-[#CEA472]/20'}`}
                  onClick={() => {
                    if (hasRecord) {
                      setSelectedWishId(String(wish.id));
                      setShowWishSelector(false);
                    } else {
                      createExpenseRecord(wish);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[#FFFFFF] font-medium">{wish.destination}</h4>
                        {isDefault && <Star className="w-4 h-4 text-[#CEA472] fill-[#CEA472]" />}
                      </div>
                      <p className="text-[#FFFFFF]/60 text-sm">
                        {wish.confirmed_date} · {wish.travelers}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasRecord ? (
                        <span className="text-[#CEA472] text-sm">已有记录</span>
                      ) : (
                        <span className="text-[#FFFFFF]/40 text-sm">点击创建记录</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultTripId(String(wish.id));
                        }}
                        className={`p-1 hover:bg-[#CEA472]/20 rounded transition-colors ${isDefault ? 'text-[#CEA472]' : 'text-[#FFFFFF]/40 hover:text-[#CEA472]'}`}
                        title={isDefault ? '默认旅行' : '设为默认旅行'}
                      >
                        <Star className={`w-5 h-5 ${isDefault ? 'fill-[#CEA472]' : ''}`} />
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
  
  // 获取旅行天数（如果有相关的旅行规划的话）
  const getTravelDays = () => {
    const plan = tripPlans?.find(p => p.wishId === selectedWishId);
    if (plan) return plan.travelDays;
    return 3; // 默认3天
  };

  return (
    <div className="space-y-6">
      {/* 标题和选择 */}
      <div className="flex justify-between items-center max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#FFFFFF]">
            {currentWish?.destination} 旅行记账
          </h2>
          {defaultTripId === selectedWishId && <Star className="w-5 h-5 text-[#CEA472] fill-[#CEA472]" />}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowWishSelector(true)}
          className="bg-black/40 border-[#CEA472]/20 text-[#CEA472] hover:bg-[#CEA472]/10"
          title="切换旅行"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* 行程简介框 */}
      <div 
        className={`mb-4 p-4 bg-black/30 border border-[#CEA472]/20 rounded-lg max-w-4xl mx-auto ${isAdminMode ? 'cursor-pointer hover:bg-black/40 transition-colors' : ''}`}
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
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[#FFFFFF] font-medium">
              {currentWish?.destination}
            </h4>
            <p className="text-[#FFFFFF]/60 text-sm">
              {getTravelDays()}天 · {currentWish?.travelers}
            </p>
          </div>
          {isAdminMode && <Edit2 className="w-4 h-4 text-[#CEA472]" />}
        </div>
      </div>

      {/* 统计卡片 */}
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/20 bg-black/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#CEA472]/10 rounded-lg border border-[#CEA472]/20">
              <div className="text-2xl font-bold text-[#CEA472]">
                ¥{stats.total.toLocaleString()}
              </div>
              <div className="text-sm text-[#FFFFFF]/60 mt-1">总支出</div>
            </div>
            {Object.entries(stats.categories).filter(([_, amount]) => amount > 0).slice(0, 3).map(([category, amount]) => (
              <div key={category} className="text-center p-4 bg-black/40 rounded-lg border border-[#CEA472]/10">
                <div className="text-lg font-semibold text-[#FFFFFF]">
                  ¥{amount.toLocaleString()}
                </div>
                <div className="text-sm text-[#FFFFFF]/60 mt-1">
                  {CATEGORY_NAMES[category as ExpenseCategory]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 添加支出按钮 */}
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => setShowAddExpense(true)}
          className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加支出
        </Button>
      </div>

      {/* 支出列表 */}
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/20 bg-black/30">
        <CardContent className="pt-6">
          {currentExpenseRecord && sortedExpenses.length > 0 ? (
            <div className="space-y-3">
              {sortedExpenses.map(expense => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-black/40 border border-[#CEA472]/10 hover:bg-black/60 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="text-2xl">
                      {CATEGORY_ICONS[expense.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#FFFFFF]">
                        {expense.description}
                      </div>
                      <div className="text-sm text-[#FFFFFF]/60 mt-1">
                        {expense.date} · {CATEGORY_NAMES[expense.category]}
                        {expense.payer && ` · ${expense.payer} 支付`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#CEA472]">
                        ¥{expense.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {isAdminMode && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowEditExpense(true);
                        }}
                        className="text-[#FFFFFF]/60 hover:text-[#CEA472] h-8 w-8"
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
                        className="text-[#FFFFFF]/60 hover:text-red-500 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-[#CEA472]/40 mx-auto mb-4" />
              <p className="text-[#FFFFFF]/60">暂无支出记录</p>
              <p className="text-sm text-[#FFFFFF]/40 mt-2">点击上方按钮添加第一笔支出</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加支出对话框 */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">添加支出</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#FFFFFF]">日期</Label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
              />
            </div>
            <div>
              <Label className="text-[#FFFFFF]">类别</Label>
              <Select
                value={newExpense.category}
                onValueChange={(value) => setNewExpense({ ...newExpense, category: value as ExpenseCategory })}
              >
                <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                  {Object.entries(CATEGORY_NAMES).map(([category, name]) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_ICONS[category as ExpenseCategory]} {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#FFFFFF]">金额</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-[#FFFFFF]">描述</Label>
              <Input
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                placeholder="支出描述"
              />
            </div>
            <div>
              <Label className="text-[#FFFFFF]">支付人（可选）</Label>
              <Input
                value={newExpense.payer || ''}
                onChange={(e) => setNewExpense({ ...newExpense, payer: e.target.value })}
                className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                placeholder="支付人姓名"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddExpense(false)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={addExpense}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑支出对话框 */}
      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑支出</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-[#FFFFFF]">日期</Label>
                <Input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]">类别</Label>
                <Select
                  value={editingExpense.category}
                  onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value as ExpenseCategory })}
                >
                  <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                    {Object.entries(CATEGORY_NAMES).map(([category, name]) => (
                      <SelectItem key={category} value={category}>
                        {CATEGORY_ICONS[category as ExpenseCategory]} {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#FFFFFF]">金额</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(editingExpense.amount)}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]">描述</Label>
                <Input
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]">支付人（可选）</Label>
                <Input
                  value={editingExpense.payer || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, payer: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditExpense(false);
                setEditingExpense(null);
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

      {/* 删除确认对话框 */}
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
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

      {/* 选择旅行对话框 */}
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
                        : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF] hover:bg-black/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {wish.destination}
                          {isDefault && <Star className="w-4 h-4 fill-[#CEA472]" />}
                        </div>
                        <div className="text-sm text-[#FFFFFF]/60 mt-1">
                          {wish.confirmed_date ? `${wish.confirmed_date} · ` : ''}{wish.travelers}
                        </div>
                        {!existingRecord && (
                          <div className="text-xs text-[#CEA472]/80 mt-1">
                            点击创建账单记录
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultTripId(String(wish.id));
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
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}