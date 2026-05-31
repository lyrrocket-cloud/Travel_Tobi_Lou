'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wish } from '@/types';

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

// 时间块的显示名称
const timeBlockNames: Record<string, string> = {
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
  breakfast: <Coffee className="w-4 h-4" />,
  morning: <Sun className="w-4 h-4" />,
  lunch: <UtensilsCrossed className="w-4 h-4" />,
  afternoon: <Sun className="w-4 h-4" />,
  dinner: <UtensilsCrossed className="w-4 h-4" />,
  evening: <Moon className="w-4 h-4" />,
  accommodation: <BedDouble className="w-4 h-4" />,
};

interface TripPlannerProps {
  confirmedWishes: Wish[];
}

export default function TripPlanner({ confirmedWishes }: TripPlannerProps) {
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [editingItem, setEditingItem] = useState<{ dayNumber: number; itemId: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
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
  const addTransport = async (dayNumber: number) => {
    if (!currentTripPlan) return;

    const newTransport: TransportInfo = {
      id: `transport-${Date.now()}`,
      type: 'other',
      from: '',
      to: '',
      departureTime: '',
      arrivalTime: '',
      details: '',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#FFFFFF]/60">加载中...</div>
      </div>
    );
  }

  // 如果没有已确认的愿望
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

  // 显示愿望选择器
  const renderWishSelector = () => (
    <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="text-[#FFFFFF]/60 text-lg mb-6">选择一个旅行来规划</div>
          <div className="grid gap-4 max-w-md mx-auto">
            {confirmedWishes.map(wish => {
              const hasPlan = tripPlans.some(plan => plan.wishId === wish.id);
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
                      {hasPlan && <span className="ml-2 text-[#CEA472]">（已有规划）</span>}
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

  // 如果显示选择器
  if (showWishSelector || !selectedWishId) {
    return renderWishSelector();
  }

  // 如果选择了愿望但还没有旅行规划
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

  return (
    <div className="space-y-6">
      {/* 旅行信息头部 */}
      <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#FFFFFF]">{currentTripPlan.destination}</h2>
              <p className="text-[#FFFFFF]/60 mt-1">
                {currentTripPlan.startDate && `${currentTripPlan.startDate} 至 ${currentTripPlan.endDate}`}
                {!currentTripPlan.startDate && `共 ${currentTripPlan.travelDays} 天`}
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
                  className="data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80"
                >
                  Day {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 每日规划内容 */}
            {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
              <TabsContent key={day} value={String(day)} className="space-y-6 mt-6">
                {currentDayPlan && (
                  <>
                    {/* 时间规划表格 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#FFFFFF]">每日规划</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[#CEA472]/20">
                              <th className="text-left py-3 px-4 text-[#FFFFFF]/60 font-medium w-24">时间</th>
                              <th className="text-left py-3 px-4 text-[#FFFFFF]/60 font-medium">规划内容</th>
                              <th className="text-left py-3 px-4 text-[#FFFFFF]/60 font-medium w-24">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentDayPlan.items.map(item => (
                              <tr key={item.id} className="border-b border-[#CEA472]/10">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2 text-[#CEA472]">
                                    {timeBlockIcons[item.time]}
                                    <span>{timeBlockNames[item.time]}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
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
                                      className="text-[#FFFFFF] cursor-pointer hover:text-[#CEA472] py-1"
                                      onClick={() => startEditing(day, item.id, item.content)}
                                    >
                                      {item.content || <span className="text-[#FFFFFF]/30">点击添加规划...</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {!editingItem?.itemId && (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => startEditing(day, item.id, item.content)}
                                      className="bg-black/40 border-[#CEA472]/30 hover:bg-[#CEA472]/10"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 交通信息 */}
                    <div className="space-y-4 mt-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[#FFFFFF]">交通信息</h3>
                        <Button
                          onClick={() => addTransport(day)}
                          className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加交通
                        </Button>
                      </div>

                      {currentDayPlan.transport.length === 0 ? (
                        <div className="text-[#FFFFFF]/40 text-center py-8">暂无交通信息</div>
                      ) : (
                        <div className="space-y-4">
                          {currentDayPlan.transport.map(transport => (
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
                                <div className="mt-4 flex justify-end">
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={() => deleteTransport(day, transport.id)}
                                    className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}