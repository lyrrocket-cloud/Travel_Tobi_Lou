'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Wish } from '@/types';

// 活动类型的显示名称
const activityTypes: Record<string, string> = {
  breakfast: '早餐',
  morning: '上午活动',
  lunch: '午餐',
  afternoon: '下午活动',
  dinner: '晚餐',
  evening: '晚间活动',
  accommodation: '住宿',
  other: '其他',
};

// 活动类型的图标
const activityTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  morning: <Sun className="w-4 h-4" />,
  lunch: <UtensilsCrossed className="w-4 h-4" />,
  afternoon: <Sun className="w-4 h-4" />,
  dinner: <UtensilsCrossed className="w-4 h-4" />,
  evening: <Moon className="w-4 h-4" />,
  accommodation: <BedDouble className="w-4 h-4" />,
  other: <Clock className="w-4 h-4" />,
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

// 活动项接口
interface ActivityItem {
  id: string;
  type: string; // 活动类型：breakfast, morning, lunch, afternoon, dinner, evening, accommodation, other
  startTime: string; // 开始时间
  endTime?: string; // 结束时间（可选）
  content?: string; // 活动内容（可选）
  location?: string; // 地点
  notes?: string; // 备注
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
  position: 'arrival' | 'departure' | 'between';
  beforeActivityId?: string; // 在哪个活动之前
  afterActivityId?: string; // 在哪个活动之后
}

// 单日旅行计划接口
interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  activities: ActivityItem[];
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
  const [selectedWishId, setSelectedWishId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travel-toolbox-selected-wish-id');
      return saved || null;
    }
    return null;
  });
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travel-toolbox-selected-day');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [editingActivity, setEditingActivity] = useState<{ dayNumber: number; activityId: string } | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<ActivityItem | null>(null);
  const [editingTransport, setEditingTransport] = useState<{ dayNumber: number; transportId: string } | null>(null);
  const [editingTransportData, setEditingTransportData] = useState<TransportInfo | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<Omit<ActivityItem, 'id'>>({
    type: 'other',
    startTime: '09:00',
    endTime: undefined,
    content: undefined,
    location: '',
    notes: undefined,
  });
  const [showSchedule, setShowSchedule] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travel-toolbox-show-schedule');
      return saved === 'true';
    }
    return false;
  });
  const [loading, setLoading] = useState(true);

  // 保存 selectedWishId 到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
    }
  }, [selectedWishId]);

  // 保存 selectedDay 到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-selected-day', String(selectedDay));
    }
  }, [selectedDay]);

  // 保存 showSchedule 到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-show-schedule', String(showSchedule));
    }
  }, [showSchedule]);

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

  // 按时间排序活动
  const getSortedActivities = (activities: ActivityItem[]) => {
    return [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // 获取日期显示
  const getDateDisplay = (day: number) => {
    if (!currentTripPlan?.startDate) return '';
    return calculateDate(currentTripPlan.startDate, day - 1);
  };

  // 添加活动
  const addActivity = async () => {
    if (!currentTripPlan) return;

    const activityId = `activity-${Date.now()}`;
    const activity: ActivityItem = {
      ...newActivity,
      id: activityId,
    };

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === selectedDay) {
        return { ...day, activities: [...day.activities, activity] };
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
        await fetchTripPlans();
        setShowAddActivity(false);
        setNewActivity({
          type: 'other',
          startTime: '09:00',
          endTime: undefined,
          content: undefined,
          location: '',
          notes: undefined,
        });
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to add activity:', error);
    }
  };

  // 更新活动
  const updateActivity = async (dayNumber: number, activityId: string, field: keyof ActivityItem, value: string) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedActivities = day.activities.map(a => {
          if (a.id === activityId) {
            return { ...a, [field]: value };
          }
          return a;
        });
        return { ...day, activities: updatedActivities };
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
      console.error('[Trip Planner] Failed to update activity:', error);
    }
  };

  // 删除活动
  const deleteActivity = async (dayNumber: number, activityId: string) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const filteredActivities = day.activities.filter(a => a.id !== activityId);
        const filteredTransport = day.transport.filter(t => 
          t.beforeActivityId !== activityId && t.afterActivityId !== activityId
        );
        return { ...day, activities: filteredActivities, transport: filteredTransport };
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
        setEditingActivity(null);
        setEditingActivityData(null);
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to delete activity:', error);
    }
  };

  // 批量更新活动数据
  const updateActivityData = async (dayNumber: number, activityId: string, updatedData: ActivityItem) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedActivities = day.activities.map(a => {
          if (a.id === activityId) {
            return updatedData;
          }
          return a;
        });
        return { ...day, activities: updatedActivities };
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
        setEditingActivity(null);
        setEditingActivityData(null);
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to update activity data:', error);
    }
  };

  // 添加交通信息
  const addTransport = async (dayNumber: number, position: 'arrival' | 'departure' | 'between', beforeActivityId?: string, afterActivityId?: string) => {
    if (!currentTripPlan) return;

    const transportId = `transport-${Date.now()}`;
    const newTransport: TransportInfo = {
      id: transportId,
      type: 'taxi',
      from: '',
      to: '',
      departureTime: '',
      arrivalTime: '',
      details: '',
      position,
      beforeActivityId,
      afterActivityId,
    };

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        return { ...day, transport: [...day.transport, newTransport] };
      }
      return day;
    });

    // 先更新本地状态
    setTripPlans(prev => prev.map(plan => {
      if (plan.id === currentTripPlan.id) {
        return { ...plan, days: updatedDays };
      }
      return plan;
    }));

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
        setEditingTransport({ dayNumber, transportId });
        setEditingTransportData(newTransport);
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to add transport:', error);
      setEditingTransport({ dayNumber, transportId });
      setEditingTransportData(newTransport);
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
        const filteredTransport = day.transport.filter(t => t.id !== transportId);
        return { ...day, transport: filteredTransport };
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
        setEditingTransport(null);
        setEditingTransportData(null);
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to delete transport:', error);
    }
  };

  // 批量更新交通信息
  const updateTransportData = async (dayNumber: number, transportId: string, updatedData: TransportInfo) => {
    if (!currentTripPlan) return;

    const updatedDays = currentTripPlan.days.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedTransport = day.transport.map(t => {
          if (t.id === transportId) {
            return updatedData;
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
        setEditingTransport(null);
        setEditingTransportData(null);
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to update transport data:', error);
    }
  };

  // 获取某个位置的交通
  const getArrivalTransport = (day: DayPlan) => {
    return day.transport.find(t => t.position === 'arrival');
  };

  const getDepartureTransport = (day: DayPlan) => {
    return day.transport.find(t => t.position === 'departure');
  };

  const getBetweenTransport = (day: DayPlan, beforeActivityId: string, afterActivityId: string) => {
    return day.transport.find(t => 
      t.position === 'between' && t.beforeActivityId === beforeActivityId && t.afterActivityId === afterActivityId
    );
  };

  // 交通项的渲染组件
  const renderTransportItem = (transport: TransportInfo, day: number) => {
    const isEditing = editingTransport?.dayNumber === day && editingTransport?.transportId === transport.id;
    const editingData = isEditing && editingTransportData ? editingTransportData : transport;

    if (isEditing) {
      return (
        <Card key={transport.id} className="border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFFFFF]/60">交通方式</Label>
                <select
                  value={editingData.type}
                  onChange={(e) => setEditingTransportData({ ...editingData, type: e.target.value })}
                  className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3"
                >
                  <option value="taxi">出租车</option>
                  <option value="flight">飞机</option>
                  <option value="train">火车</option>
                  <option value="bus">大巴</option>
                  <option value="walk">步行</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">出发地</Label>
                <Input
                  value={editingData.from}
                  onChange={(e) => setEditingTransportData({ ...editingData, from: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="从哪里出发"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">目的地</Label>
                <Input
                  value={editingData.to}
                  onChange={(e) => setEditingTransportData({ ...editingData, to: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="到哪里去"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">出发时间</Label>
                <Input
                  type="time"
                  value={editingData.departureTime || ''}
                  onChange={(e) => setEditingTransportData({ ...editingData, departureTime: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">到达时间</Label>
                <Input
                  type="time"
                  value={editingData.arrivalTime || ''}
                  onChange={(e) => setEditingTransportData({ ...editingData, arrivalTime: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">备注</Label>
                <Input
                  value={editingData.details || ''}
                  onChange={(e) => setEditingTransportData({ ...editingData, details: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
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
                onClick={() => {
                  if (editingTransportData) {
                    updateTransportData(day, transport.id, editingTransportData);
                  }
                }}
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div 
        key={transport.id}
        className="bg-black/30 border border-[#CEA472]/20 rounded-md p-3 cursor-pointer hover:bg-black/40 transition-colors"
        onClick={() => {
          setEditingTransport({ dayNumber: day, transportId: transport.id });
          setEditingTransportData({ ...transport });
        }}
      >
        <div className="flex items-center gap-2 text-[#CEA472]">
          {transportIcons[transport.type] || transportIcons['other']}
          <span className="font-medium">{transportNames[transport.type] || '未设置'}</span>
        </div>
        {(transport.from || transport.to) && (
          <div className="text-[#FFFFFF]/80 text-sm mt-1 flex items-center gap-2">
            {transport.from && <span>{transport.from}</span>}
            {transport.from && transport.to && <ArrowRight className="w-3 h-3" />}
            {transport.to && <span>{transport.to}</span>}
          </div>
        )}
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
        {!transport.type && !transport.from && !transport.to && (
          <div className="text-[#FFFFFF]/30 text-xs mt-1">点击编辑交通信息</div>
        )}
      </div>
    );
  };

  // 活动项的渲染组件
  const renderActivityItem = (activity: ActivityItem, day: number) => {
    const isEditing = editingActivity?.dayNumber === day && editingActivity?.activityId === activity.id;
    const editingData = isEditing && editingActivityData ? editingActivityData : activity;

    if (isEditing) {
      return (
        <Card key={activity.id} className="border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFFFFF]/60">活动类型</Label>
                <select
                  value={editingData.type}
                  onChange={(e) => setEditingActivityData({ ...editingData, type: e.target.value })}
                  className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3"
                >
                  <option value="breakfast">早餐</option>
                  <option value="morning">上午活动</option>
                  <option value="lunch">午餐</option>
                  <option value="afternoon">下午活动</option>
                  <option value="dinner">晚餐</option>
                  <option value="evening">晚间活动</option>
                  <option value="accommodation">住宿</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">地点</Label>
                <Input
                  value={editingData.location || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, location: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="活动地点"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">开始时间</Label>
                <Input
                  type="time"
                  value={editingData.startTime}
                  onChange={(e) => setEditingActivityData({ ...editingData, startTime: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60">结束时间 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  type="time"
                  value={editingData.endTime || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, endTime: e.target.value || undefined })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">活动内容 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.content || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, content: e.target.value || undefined })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="活动内容"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">备注 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.notes || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, notes: e.target.value || undefined })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="备注"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="icon"
                variant="destructive"
                onClick={() => deleteActivity(day, activity.id)}
                className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => {
                  if (editingActivityData) {
                    updateActivityData(day, activity.id, editingActivityData);
                  }
                }}
                className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div 
        key={activity.id}
        className="bg-black/30 border border-[#CEA472]/20 rounded-md p-4 cursor-pointer hover:bg-black/40 transition-colors"
        onClick={() => {
          setEditingActivity({ dayNumber: day, activityId: activity.id });
          setEditingActivityData({ ...activity });
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#CEA472]/20 flex items-center justify-center">
            {activityTypeIcons[activity.type] || activityTypeIcons['other']}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#CEA472] font-medium">{activityTypes[activity.type]}</span>
                <span className="text-[#FFFFFF]/60 text-sm">
                  {activity.startTime}
                  {activity.endTime && ` - ${activity.endTime}`}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingActivity({ dayNumber: day, activityId: activity.id });
                  setEditingActivityData({ ...activity });
                }}
                className="text-[#FFFFFF]/40 hover:text-[#CEA472] h-8 w-8"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            {activity.content && (
              <p className="text-[#FFFFFF] mt-1">{activity.content}</p>
            )}
            {activity.location && (
              <p className="text-[#FFFFFF]/60 text-sm mt-1">📍 {activity.location}</p>
            )}
            {activity.notes && (
              <p className="text-[#FFFFFF]/40 text-xs mt-1">{activity.notes}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#FFFFFF]/60">加载中...</div>
      </div>
    );
  }

  if (!currentTripPlan) {
    return (
      <div className="text-center py-12">
        <div className="text-[#FFFFFF]/60">请先选择一个已确认成行的愿望</div>
      </div>
    );
  }

  const sortedActivities = currentDayPlan ? getSortedActivities(currentDayPlan.activities) : [];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-[#CEA472]">
          {currentTripPlan.destination} 旅行规划
        </h3>
        <Button
            variant="outline"
            onClick={() => setShowWishSelector(!showWishSelector)}
            className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]/80"
          >
            切换行程
          </Button>
      </div>

      {showSchedule && (
        <Card className="mb-6 border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[#CEA472] font-medium">📅 旅行日程表</h4>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSchedule(false)}
                className="text-[#FFFFFF]/60"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px] schedule-scroll">
                <div className="flex min-w-max">
                  <div className="w-16 flex-shrink-0 flex flex-col">
                    <div className="h-12 border-b border-[#CEA472]/20"></div>
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <div key={hour} className="h-10 border-b border-[#CEA472]/10 text-xs text-[#FFFFFF]/40 px-2 py-1">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex">
                    {currentTripPlan?.days.map(day => {
                      const sortedActivities = getSortedActivities(day.activities);
                      const date = getDateDisplay(day.dayNumber);
                      
                      const getTimePosition = (time: string) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return (hours * 60 + minutes) * (40 / 60);
                      };
                      
                      const getDuration = (startTime: string, endTime?: string) => {
                        if (!endTime) return 60;
                        const [startHours, startMinutes] = startTime.split(':').map(Number);
                        const [endHours, endMinutes] = endTime.split(':').map(Number);
                        const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                        return Math.max(durationMinutes * (40 / 60), 60);
                      };
                      
                      // 构建活动列表，包含交通信息
                      const mergedItems: Array<{
                        id: string;
                        type: 'arrival' | 'departure' | 'activity';
                        startTime: string;
                        endTime?: string;
                        activity: ActivityItem | null;
                        transportBefore: TransportInfo | null;
                        transportAfter: TransportInfo | null;
                      }> = [];
                      
                      // 添加到达（第一天）
                      if (day.dayNumber === 1) {
                        const arrival = getArrivalTransport(day);
                        if (arrival) {
                          const firstActivity = sortedActivities[0];
                          // 使用交通的出发时间作为到达卡片的起始点，结束时间为到达时间
                          const arrivalStartTime = arrival.departureTime || arrival.arrivalTime || '00:00';
                          const arrivalEndTime = arrival.arrivalTime || firstActivity?.startTime || arrivalStartTime;
                          
                          mergedItems.push({
                            id: 'arrival',
                            type: 'arrival',
                            startTime: arrivalStartTime,
                            endTime: arrivalEndTime,
                            activity: null,
                            transportBefore: null,
                            transportAfter: sortedActivities.length > 0 
                              ? (getBetweenTransport(day, 'arrival', sortedActivities[0].id) || null)
                              : null,
                          });
                        }
                      }
                      
                      // 添加活动和交通
                      sortedActivities.forEach((activity, index) => {
                        const prevActivity = sortedActivities[index - 1];
                        let transportBefore = prevActivity 
                          ? (getBetweenTransport(day, prevActivity.id, activity.id) || null)
                          : null;
                        
                        if (!transportBefore && day.dayNumber === 1 && !getArrivalTransport(day)) {
                          transportBefore = getBetweenTransport(day, 'arrival', activity.id) || null;
                        }
                        
                        const nextActivity = sortedActivities[index + 1];
                        let transportAfter = nextActivity 
                          ? (getBetweenTransport(day, activity.id, nextActivity.id) || null) 
                          : null;
                        
                        // 如果是最后一天最后一个活动，检查离开前的交通
                        if (day.dayNumber === currentTripPlan.travelDays && !nextActivity && getDepartureTransport(day)) {
                          transportAfter = getBetweenTransport(day, activity.id, 'departure') || null;
                        }
                        
                        mergedItems.push({
                          id: activity.id,
                          type: 'activity',
                          startTime: activity.startTime,
                          endTime: activity.endTime,
                          activity: activity,
                          transportBefore: transportBefore,
                          transportAfter: transportAfter,
                        });
                      });
                      
                      // 添加离开（最后一天）
                      if (day.dayNumber === currentTripPlan.travelDays) {
                        const departure = getDepartureTransport(day);
                        if (departure) {
                          const lastActivity = sortedActivities[sortedActivities.length - 1];
                          // 正确设置离开的时间范围：开始时间是最后一个活动的结束时间（如果有），结束时间是出发时间
                          const departureStartTime = lastActivity && lastActivity.endTime ? lastActivity.endTime : (departure.departureTime || '23:00');
                          const departureEndTime = departure.departureTime || '23:00';
                          
                          mergedItems.push({
                            id: 'departure',
                            type: 'departure',
                            startTime: departureStartTime,
                            endTime: departureEndTime,
                            activity: null,
                            transportBefore: sortedActivities.length > 0 
                              ? (getBetweenTransport(day, sortedActivities[sortedActivities.length - 1].id, 'departure') || null)
                              : null,
                            transportAfter: null,
                          });
                        }
                      }
                      
                      return (
                        <div key={day.id} className="flex-1 min-w-[180px] max-w-[200px] flex flex-col border-l border-[#CEA472]/20">
                          <div className="h-12 border-b border-[#CEA472]/20 p-2 text-center">
                            <div className="text-[#CEA472] font-medium text-sm">Day {day.dayNumber}</div>
                            {date && <div className="text-[#FFFFFF]/60 text-xs">{date}</div>}
                          </div>
                          <div className="flex-1 relative">
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                              <div key={hour} className="h-10 border-b border-[#CEA472]/10"></div>
                            ))}
                            {mergedItems.map(item => {
                              const top = getTimePosition(item.startTime);
                              const height = getDuration(item.startTime, item.endTime);
                              
                              let bgColor = '';
                              let borderColor = '';
                              let title = '';
                              let subtitle = '';
                              let transportText = '';
                              let icon = null;
                              
                              if (item.type === 'arrival') {
                                bgColor = 'bg-[#CEA472]/10';
                                borderColor = 'border-[#CEA472]';
                                title = '到达';
                                const arrival = getArrivalTransport(day);
                                subtitle = arrival?.to || '目的地';
                                icon = arrival ? transportIcons[arrival.type] || transportIcons['other'] : transportIcons['other'];
                                if (item.transportAfter) {
                                  const transport = item.transportAfter;
                                  transportText = `下一程: ${transportNames[transport.type] || transport.type || '交通'} - ${transport.to || '后站'}`;
                                }
                              } else if (item.type === 'departure') {
                                bgColor = 'bg-[#CEA472]/10';
                                borderColor = 'border-[#CEA472]';
                                title = '离开';
                                const departure = getDepartureTransport(day);
                                subtitle = departure?.from || '出发地';
                                icon = departure ? transportIcons[departure.type] || transportIcons['other'] : transportIcons['other'];
                              } else if (item.activity) {
                                bgColor = 'bg-[#CEA472]/15';
                                borderColor = 'border-[#CEA472]';
                                icon = activityTypeIcons[item.activity.type] || activityTypeIcons['other'];
                                title = activityTypes[item.activity.type] || '活动';
                                subtitle = item.activity.content || item.activity.location || '';
                                
                                if (item.transportAfter) {
                                  const t = item.transportAfter;
                                  transportText = `下一程: ${transportNames[t.type] || t.type || '交通'} - ${t.to || '后站'}`;
                                }
                              }
                              
                              return (
                                <div
                                  key={item.id}
                                  className={`absolute left-1 right-1 ${bgColor} border ${borderColor} rounded-md p-1 overflow-hidden`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: 20,
                                  }}
                                >
                                  <div className="flex items-start gap-1">
                                    <div className="text-[#CEA472] flex-shrink-0 mt-0.5">
                                      {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[#FFFFFF] font-medium text-xs truncate">{title}</div>
                                      {subtitle && (
                                        <div className="text-[#FFFFFF]/60 text-[10px] truncate">{subtitle}</div>
                                      )}
                                      {transportText && (
                                        <div className="text-[#CEA472]/80 text-[10px] truncate">{transportText}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showWishSelector && (
        <Card className="mb-6 border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[#CEA472] font-medium">选择愿望</h4>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowWishSelector(false)}
                className="text-[#FFFFFF]/60"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {confirmedWishes.map(wish => (
                <button
                  key={wish.id}
                  onClick={() => {
                    setSelectedWishId(wish.id);
                    setShowWishSelector(false);
                  }}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedWishId === wish.id
                      ? 'bg-[#CEA472]/20 border-[#CEA472] text-[#CEA472]'
                      : 'bg-black/30 border-[#CEA472]/20 text-[#FFFFFF]/80 hover:bg-black/50'
                  }`}
                >
                  <div className="font-medium">{wish.destination}</div>
                  <div className="text-sm text-[#FFFFFF]/50">
                    {wish.confirmed_date} · {wish.travel_year}年{wish.travel_month} · {wish.travelers}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 p-4 bg-black/30 border border-[#CEA472]/20 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[#FFFFFF] font-medium">
              {currentTripPlan.destination}
            </h4>
            <p className="text-[#FFFFFF]/60 text-sm">
              {currentTripPlan.travelDays}天 · {currentTripPlan.travelers}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))} className="w-full">
        <TabsList className="inline-flex h-[72px] bg-black/40 backdrop-blur-sm border border-[#CEA472]/20 rounded-lg p-1 gap-1 w-full justify-start overflow-x-auto">
          {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
            <TabsTrigger
              key={day}
              value={String(day)}
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 flex flex-col items-center justify-center py-2 px-4 rounded-md transition-all duration-300 min-w-[80px]"
            >
              <span className="text-sm font-medium whitespace-nowrap">Day {day}</span>
              {getDateDisplay(day) && (
                <span className="text-xs opacity-70 whitespace-nowrap">{getDateDisplay(day)}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
          <TabsContent key={day} value={String(day)} className="mt-6">
            <div className="space-y-4">
              {/* 到达 */}
              {day === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#CEA472]">
                    <Plane className="w-4 h-4" />
                    <span className="font-medium">到达</span>
                  </div>
                  {currentDayPlan && getArrivalTransport(currentDayPlan) ? (
                    renderTransportItem(getArrivalTransport(currentDayPlan)!, day)
                  ) : (
                    <Button
                      onClick={() => addTransport(day, 'arrival')}
                      variant="outline"
                      className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加到达
                    </Button>
                  )}
                  {/* 到达和第一个活动之间的交通 */}
                  {currentDayPlan && sortedActivities.length > 0 && (
                    <div className="pl-8 space-y-2">
                      {getBetweenTransport(currentDayPlan, 'arrival', sortedActivities[0].id) ? (
                        renderTransportItem(getBetweenTransport(currentDayPlan, 'arrival', sortedActivities[0].id)!, day)
                      ) : (
                        <Button
                          onClick={() => addTransport(day, 'between', 'arrival', sortedActivities[0].id)}
                          variant="outline"
                          className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加交通
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 活动列表 */}
              <div className="space-y-4">
                {sortedActivities.length === 0 ? (
                  <div className="text-center py-8 text-[#FFFFFF]/40">
                    暂无活动，点击下方按钮添加
                  </div>
                ) : (
                  sortedActivities.map((activity, index) => (
                    <div key={activity.id} className="space-y-4">
                      {/* 前一个活动和当前活动之间的交通 */}
                      {index > 0 && (
                        <div className="pl-8 space-y-2">
                          {currentDayPlan && getBetweenTransport(currentDayPlan, sortedActivities[index - 1].id, activity.id) ? (
                            renderTransportItem(getBetweenTransport(currentDayPlan, sortedActivities[index - 1].id, activity.id)!, day)
                          ) : (
                            <Button
                              onClick={() => addTransport(day, 'between', sortedActivities[index - 1].id, activity.id)}
                              variant="outline"
                              className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              添加交通
                            </Button>
                          )}
                        </div>
                      )}

                      {/* 活动项 */}
                      {renderActivityItem(activity, day)}
                    </div>
                  ))
                )}
              </div>

              {/* 添加活动按钮 */}
              <div>
                {showAddActivity ? (
                  <Card className="border border-[#CEA472]/20 bg-black/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[#CEA472] font-medium">添加新活动</h4>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setShowAddActivity(false)}
                          className="text-[#FFFFFF]/60"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[#FFFFFF]/60">活动类型</Label>
                          <select
                            value={newActivity.type}
                            onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                            className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3"
                          >
                            <option value="breakfast">早餐</option>
                            <option value="morning">上午活动</option>
                            <option value="lunch">午餐</option>
                            <option value="afternoon">下午活动</option>
                            <option value="dinner">晚餐</option>
                            <option value="evening">晚间活动</option>
                            <option value="accommodation">住宿</option>
                            <option value="other">其他</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60">地点</Label>
                          <Input
                            value={newActivity.location || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                            placeholder="活动地点"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60">开始时间</Label>
                          <Input
                            type="time"
                            value={newActivity.startTime}
                            onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60">结束时间 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            type="time"
                            value={newActivity.endTime || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[#FFFFFF]/60">活动内容 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            value={newActivity.content || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, content: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                            placeholder="活动内容"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[#FFFFFF]/60">备注 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            value={newActivity.notes || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                            placeholder="备注"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={addActivity}
                          className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          保存活动
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    onClick={() => setShowAddActivity(true)}
                    className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加活动
                  </Button>
                )}
              </div>

              {/* 最后一个活动和离开之间的交通 */}
              {day === currentTripPlan.travelDays && currentDayPlan && sortedActivities.length > 0 && (
                <div className="pl-8 space-y-2 mt-6">
                  {getBetweenTransport(currentDayPlan, sortedActivities[sortedActivities.length - 1].id, 'departure') ? (
                    renderTransportItem(getBetweenTransport(currentDayPlan, sortedActivities[sortedActivities.length - 1].id, 'departure')!, day)
                  ) : (
                    <Button
                      onClick={() => addTransport(day, 'between', sortedActivities[sortedActivities.length - 1].id, 'departure')}
                      variant="outline"
                      className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加交通
                    </Button>
                  )}
                </div>
              )}
              {/* 离开 */}
              {day === currentTripPlan.travelDays && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-[#CEA472]">
                    <Plane className="w-4 h-4" />
                    <span className="font-medium">离开</span>
                  </div>
                  {currentDayPlan && getDepartureTransport(currentDayPlan) ? (
                    renderTransportItem(getDepartureTransport(currentDayPlan)!, day)
                  ) : (
                    <Button
                      onClick={() => addTransport(day, 'departure')}
                      variant="outline"
                      className="w-full justify-start bg-black/30 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加离开
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="mt-8">
        <Button
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
        >
          <span className="mr-2">📅</span>
          {showSchedule ? '收起日程表' : '生成日程表'}
        </Button>
      </div>
    </div>
  );
}
