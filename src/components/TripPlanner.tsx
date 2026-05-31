'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wish } from '@/types';

// 时间块的显示名称
const timeBlockNames: Record<string, string> = {
  arrival: '到达',
  departure: '离开',
  breakfast: '早餐',
  morning: '上午',
  lunch: '午餐',
  afternoon: '下午',
  dinner: '晚餐',
  evening: '晚间',
  accommodation: '住宿',
};

// 时间块的图标
const timeBlockIcons: Record<string, React.ReactNode> = {
  arrival: <Plane className="w-4 h-4" />,
  departure: <Plane className="w-4 h-4" />,
  breakfast: <Coffee className="w-4 h-4" />,
  morning: <Sun className="w-4 h-4" />,
  lunch: <UtensilsCrossed className="w-4 h-4" />,
  afternoon: <Sun className="w-4 h-4" />,
  dinner: <UtensilsCrossed className="w-4 h-4" />,
  evening: <Moon className="w-4 h-4" />,
  accommodation: <BedDouble className="w-4 h-4" />,
};

// 交通方式图标
const transportIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  taxi: <Car className="w-4 h-4" />,
  walk: <ArrowRight className="w-4 h-4" />,
  other: <Car className="w-4 h-4" />,
};

// 交通方式名称
const transportNames: Record<string, string> = {
  flight: '飞机',
  train: '火车',
  bus: '大巴',
  taxi: '出租车',
  walk: '步行',
  other: '其他',
};

// 旅行规划日程项接口
interface DayPlanItem {
  id: string;
  time: string;
  content: string;
  location?: string;
  notes?: string;
}

// 交通信息接口
interface TransportInfo {
  id: string;
  type: string;
  from: string;
  to: string;
  departureTime?: string;
  arrivalTime?: string;
  details?: string;
  position: 'before' | 'after'; // 交通项的位置
  beforeTime?: string; // 在哪个时间块之前
  afterTime?: string; // 在哪个时间块之后
}

// 单日旅行计划接口
interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  items: DayPlanItem[];
  transport: TransportInfo[];
}

// 旅行规划接口
interface TripPlan {
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

interface TripPlannerProps {
  confirmedWishes: Wish[];
}

// 日期计算函数
const calculateDate = (startDate: string, dayOffset: number): string => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TripPlanner({ confirmedWishes }: TripPlannerProps) {
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [editingItem, setEditingItem] = useState<{ dayNumber: number; itemId: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingTransport, setEditingTransport] = useState<{ dayNumber: number; transportId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 默认选择第一个有规划的愿望
  useEffect(() => {
    if (confirmedWishes.length > 0 && tripPlans.length > 0 && !selectedWishId) {
      const firstWishWithPlan = confirmedWishes.find(wish => 
        tripPlans.some(plan => plan.wishId === wish.id)
      );
      if (firstWishWithPlan) {
        setSelectedWishId(firstWishWithPlan.id);
      } else if (confirmedWishes.length > 0) {
        setSelectedWishId(confirmedWishes[0].id);
      }
    }
  }, [confirmedWishes, tripPlans, selectedWishId]);

  // 加载旅行规划数据
  const fetchTripPlans = async () => {
    try {
      const response = await fetch('/api/trip-plans');
      const data = await response.json();
      setTripPlans(data.tripPlans || []);
    } catch (error) {
      console.error('[Trip Planner] Failed to fetch trip plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripPlans();
  }, []);

  // 获取当前选择的愿望对应的旅行规划
  const currentTripPlan = selectedWishId ? tripPlans.find(plan => plan.wishId === selectedWishId) : null;
  
  // 获取当前选择的天的计划
  const currentDayPlan = currentTripPlan?.days.find(d => d.dayNumber === selectedDay);

  // 开始编辑某个项目
  const startEditing = (dayNumber: number, itemId: string, currentContent: string) => {
    setEditingItem({ dayNumber, itemId });
    setEditingValue(currentContent);
  };

  // 保存编辑
  const saveEditing = async () => {
    if (!editingItem || !currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === editingItem.dayNumber) {
        const updatedItems = day.items.map(item => {
          if (item.id === editingItem.itemId) {
            return { ...item, content: editingValue };
          }
          return item;
        });
        return { ...day, items: updatedItems };
      }
      return day;
    });

    try {
      const response = await fetch('/api/trip-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTripPlan.id,
          days: updatedDays,
        }),
      });

      if (response.ok) {
        fetchTripPlans();
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to update trip plan:', error);
    }

    setEditingItem(null);
    setEditingValue('');
  };

  // 添加交通信息
  const addTransport = async (dayNumber: number, position: 'before' | 'after' | 'arrival' | 'departure', relativeTime?: string) => {
    if (!currentTripPlan) return;

    const newTransport: TransportInfo = {
      id: `transport-${Date.now()}`,
      type: '',
      from: '',
      to: '',
      departureTime: '',
      arrivalTime: '',
      details: '',
      position,
      beforeTime: position === 'before' ? relativeTime : undefined,
      afterTime: position === 'after' ? relativeTime : undefined,
    };

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        return { ...day, transport: [...day.transport, newTransport] };
      }
      return day;
    });

    try {
      const response = await fetch('/api/trip-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTripPlan.id,
          days: updatedDays,
        }),
      });

      if (response.ok) {
        fetchTripPlans();
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to add transport:', error);
    }
  };

  // 更新交通信息
  const updateTransport = async (dayNumber: number, transportId: string, field: keyof TransportInfo, value: string) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedTransport = day.transport.map(t => {
          if (t.id === transportId) {
            return { ...t, [field]: value };
          }
          return t;
        });
        return { ...day, transport: updatedTransport };
      }
      return day;
    });

    try {
      const response = await fetch('/api/trip-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTripPlan.id,
          days: updatedDays,
        }),
      });

      if (response.ok) {
        fetchTripPlans();
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to update transport:', error);
    }
  };

  // 删除交通信息
  const deleteTransport = async (dayNumber: number, transportId: string) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedTransport = day.transport.filter(t => t.id !== transportId);
        return { ...day, transport: updatedTransport };
      }
      return day;
    });

    try {
      const response = await fetch('/api/trip-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTripPlan.id,
          days: updatedDays,
        }),
      });

      if (response.ok) {
        fetchTripPlans();
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to delete transport:', error);
    }
  };

  // 获取某位置的交通项
  const getTransportByPosition = (day: DayPlan, position: 'arrival' | 'departure' | 'before' | 'after', relativeTime?: string) => {
    if (position === 'arrival' || position === 'departure') {
      return day.transport.filter(t => t.position === position);
    }
    if (position === 'before') {
      return day.transport.filter(t => t.position === 'before' && t.beforeTime === relativeTime);
    }
    return day.transport.filter(t => t.position === 'after' && t.afterTime === relativeTime);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#FFFFFF]/60">加载中...</div>
      </div>
    );
  }

  if (confirmedWishes.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="text-[#FFFFFF]/60 text-lg mb-4">暂无已确认成行的旅行</div>
            <div className="text-[#FFFFFF]/40 text-sm">请先在许愿池中确认成行一个愿望</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderWishSelector = () => (
    <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="text-[#FFFFFF]/60 text-lg mb-6">选择一个旅行来规划</div>
          <div className="grid gap-4 max-w-md mx-auto">
            {confirmedWishes.map(wish => {
              return (
                <Button
                  key={wish.id}
                  onClick={() => {
                    setSelectedWishId(wish.id);
                    setShowWishSelector(false);
                  }}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4 bg-black/40 border-[#CEA472]/30 hover:bg-[#CEA472]/10 hover:border-[#CEA472]/50"
                >
                  <div>
                    <div className="font-semibold text-[#FFFFFF]">{wish.destination}</div>
                    <div className="text-sm text-[#FFFFFF]/60">
                      {wish.travel_year}年{wish.travel_month}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (showWishSelector || !selectedWishId) {
    return renderWishSelector();
  }

  if (!currentTripPlan) {
    const selectedWish = confirmedWishes.find(w => w.id === selectedWishId);
    return (
      <div className="space-y-6">
        <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#FFFFFF]">{selectedWish?.destination}</h2>
              <Button
                variant="outline"
                onClick={() => setShowWishSelector(true)}
                className="bg-black/40 border-[#CEA472]/30 hover:bg-[#CEA472]/10"
              >
                切换旅行
              </Button>
            </div>
            <div className="text-center py-8">
              <div className="text-[#FFFFFF]/60 mb-6">暂无旅行规划</div>
              <Button
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
                onClick={() => {
                  window.location.reload();
                }}
              >
                创建旅行规划
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 计算日期显示
  const getDateDisplay = (dayNumber: number) => {
    if (!currentTripPlan.startDate) return '';
    return calculateDate(currentTripPlan.startDate, dayNumber - 1);
  };

  // 交通项的渲染组件
  const renderTransportItem = (transport: TransportInfo, day: number, compact = false) => {
    const isEditing = editingTransport?.dayNumber === day && editingTransport?.transportId === transport.id;
    
    if (isEditing) {
      return (
        <Card key={transport.id} className="border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFFFFF]/60">交通方式</Label>
                <select
                  value={transport.type}
                  onChange={(e) => updateTransport(day, transport.id, 'type', e.target.value)}
                  className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3"
                >
                  <option value="">请选择</option>
                  <option value="flight">飞机</option>
                  <option value="train">火车</option>
                  <option value="bus">大巴</option>
                  <option value="taxi">出租车</option>
                  <option value="walk">步行</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">出发地</Label>
                <Input
                  value={transport.from}
                  onChange={(e) => updateTransport(day, transport.id, 'from', e.target.value)}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="从哪里出发"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">目的地</Label>
                <Input
                  value={transport.to}
                  onChange={(e) => updateTransport(day, transport.id, 'to', e.target.value)}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="到哪里去"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">出发时间</Label>
                <Input
                  type="time"
                  value={transport.departureTime}
                  onChange={(e) => updateTransport(day, transport.id, 'departureTime', e.target.value)}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">到达时间</Label>
                <Input
                  type="time"
                  value={transport.arrivalTime}
                  onChange={(e) => updateTransport(day, transport.id, 'arrivalTime', e.target.value)}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">备注</Label>
                <Input
                  value={transport.details || ''}
                  onChange={(e) => updateTransport(day, transport.id, 'details', e.target.value)}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="其他说明信息"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="icon"
                variant="destructive"
                onClick={() => deleteTransport(day, transport.id)}
                className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setEditingTransport(null)}
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (transport.type) {
      return (
        <div 
          key={transport.id}
          className="bg-black/30 border border-[#CEA472]/20 rounded-md p-3 cursor-pointer hover:bg-black/40 transition-colors"
          onClick={() => setEditingTransport({ dayNumber: day, transportId: transport.id })}
        >
          <div className="flex items-center gap-2 text-[#CEA472]">
            {transportIcons[transport.type] || transportIcons['other']}
            <span className="font-medium">{transportNames[transport.type]}</span>
          </div>
          <div className="text-[#FFFFFF]/80 text-sm mt-1 flex items-center gap-2">
            {transport.from && <span>{transport.from}</span>}
            {transport.from && transport.to && <span>→</span>}
            {transport.to && <span>{transport.to}</span>}
          </div>
          {(transport.departureTime || transport.arrivalTime) && (
            <div className="text-[#FFFFFF]/60 text-xs mt-1">
              {transport.departureTime && <span>出发: {transport.departureTime}</span>}
              {transport.departureTime && transport.arrivalTime && <span> | </span>}
              {transport.arrivalTime && <span>到达: {transport.arrivalTime}</span>}
            </div>
          )}
          {transport.details && (
            <div className="text-[#FFFFFF]/50 text-xs mt-1">{transport.details}</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* 旅行信息头部 */}
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#FFFFFF]">{currentTripPlan.destination}</h2>
              <p className="text-[#FFFFFF]/60 mt-1">
                {currentTripPlan.startDate && currentTripPlan.endDate 
                  ? `${currentTripPlan.startDate} 至 ${currentTripPlan.endDate}`
                  : `共 ${currentTripPlan.travelDays} 天`}
              </p>
              <p className="text-[#FFFFFF]/40 text-sm mt-1">同行人员：{currentTripPlan.travelers}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowWishSelector(true)}
              className="bg-black/40 border-[#CEA472]/30 hover:bg-[#CEA472]/10"
            >
              切换旅行
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 天数Tab切换 */}
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
        <CardContent className="pt-6">
          <Tabs
            value={String(selectedDay)}
            onValueChange={(value) => setSelectedDay(parseInt(value))}
            className="w-full"
          >
            <TabsList className="grid w-full bg-black/40 border border-[#CEA472]/20" style={{ gridTemplateColumns: `repeat(${Math.min(currentTripPlan.travelDays, 7)}, 1fr)` }}>
              {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
                <TabsTrigger
                  key={day}
                  value={String(day)}
                  className="data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 flex flex-col"
                >
                  <span>Day {day}</span>
                  {getDateDisplay(day) && (
                    <span className="text-xs opacity-70">{getDateDisplay(day)}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 每日规划内容 */}
            {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
              <TabsContent key={day} value={String(day)} className="space-y-6 mt-6">
                {currentDayPlan && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#FFFFFF]">
                      第{day}天规划
                      {getDateDisplay(day) && <span className="text-[#FFFFFF]/60 ml-2">({getDateDisplay(day)})</span>}
                    </h3>
                    
                    <div className="space-y-3">
                      {/* 到达交通（仅第一天） */}
                      {day === 1 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[#CEA472]">
                            {timeBlockIcons['arrival']}
                            <span className="font-medium">到达</span>
                          </div>
                          
                          {getTransportByPosition(currentDayPlan, 'arrival').length > 0 ? (
                            getTransportByPosition(currentDayPlan, 'arrival').map(transport => renderTransportItem(transport, day))
                          ) : (
                            <Button
                              onClick={() => addTransport(day, 'arrival')}
                              variant="outline"
                              className="w-full justify-start bg-black/40 border border-[#CEA472]/30 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              添加到达交通
                            </Button>
                          )}
                        </div>
                      )}

                      {/* 时间规划和交通穿插 */}
                      <div className="space-y-3">
                        {currentDayPlan.items.map((item, idx) => {
                          const beforeTransport = day !== 1 && day !== currentTripPlan.travelDays 
                            ? getTransportByPosition(currentDayPlan, 'before', item.time) 
                            : [];
                          const afterTransport = day !== 1 && day !== currentTripPlan.travelDays 
                            ? getTransportByPosition(currentDayPlan, 'after', item.time) 
                            : [];
                          
                          return (
                            <React.Fragment key={item.id}>
                              {/* 之前的交通 */}
                              {beforeTransport.length > 0 && (
                                <div className="space-y-2 ml-6">
                                  {beforeTransport.map(transport => renderTransportItem(transport, day))}
                                  {day !== 1 && day !== currentTripPlan.travelDays && beforeTransport.length === 0 && (
                                    <Button
                                      onClick={() => addTransport(day, 'before', item.time)}
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      添加前往交通
                                    </Button>
                                  )}
                                </div>
                              )}

                              {/* 时间块 */}
                              <div className="bg-black/30 border border-[#CEA472]/10 rounded-md">
                                <div className="grid grid-cols-12 gap-0">
                                  <div className="col-span-2 p-3 border-r border-[#CEA472]/10 flex items-center gap-2">
                                    {timeBlockIcons[item.time]}
                                    <span className="text-[#CEA472] font-medium">{timeBlockNames[item.time]}</span>
                                  </div>
                                  <div className="col-span-9 p-3">
                                    {editingItem?.dayNumber === day && editingItem?.itemId === item.id ? (
                                      <div className="flex gap-2 items-center">
                                        <Input
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] flex-1"
                                          autoFocus
                                        />
                                        <Button
                                          size="icon"
                                          onClick={saveEditing}
                                          className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
                                        >
                                          <Save className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div
                                        className="text-[#FFFFFF] cursor-pointer hover:text-[#CEA472]"
                                        onClick={() => startEditing(day, item.id, item.content)}
                                      >
                                        {item.content || <span className="text-[#FFFFFF]/30">点击添加规划...</span>}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-1 p-3 flex items-center justify-end">
                                    {!editingItem?.itemId && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => startEditing(day, item.id, item.content)}
                                        className="text-[#FFFFFF]/40 hover:text-[#CEA472]"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 之后的交通 */}
                              {idx !== currentDayPlan.items.length - 1 && afterTransport.length > 0 && (
                                <div className="space-y-2 ml-6">
                                  {afterTransport.map(transport => renderTransportItem(transport, day))}
                                </div>
                              )}

                              {/* 添加交通按钮（在时间块之后） */}
                              {day !== 1 && day !== currentTripPlan.travelDays && (
                                <div className="ml-6">
                                  {idx === currentDayPlan.items.length - 1 ? (
                                    afterTransport.length === 0 && (
                                      <Button
                                        onClick={() => addTransport(day, 'after', item.time)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        添加返程交通
                                      </Button>
                                    )
                                  ) : (
                                    afterTransport.length === 0 && (
                                      <Button
                                        onClick={() => addTransport(day, 'after', item.time)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        添加后续交通
                                      </Button>
                                    )
                                  )}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* 离开交通（仅最后一天） */}
                      {day === currentTripPlan.travelDays && (
                        <div className="space-y-2 mt-6">
                          <div className="flex items-center gap-2 text-[#CEA472]">
                            {timeBlockIcons['departure']}
                            <span className="font-medium">离开</span>
                          </div>
                          
                          {getTransportByPosition(currentDayPlan, 'departure').length > 0 ? (
                            getTransportByPosition(currentDayPlan, 'departure').map(transport => renderTransportItem(transport, day))
                          ) : (
                            <Button
                              onClick={() => addTransport(day, 'departure')}
                              variant="outline"
                              className="w-full justify-start bg-black/40 border border-[#CEA472]/30 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              添加离开交通
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}