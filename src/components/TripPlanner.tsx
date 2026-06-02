'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock, Calendar, Footprints, MapPin, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Wish, ActivityItem, TransportInfo, DayPlan, TripPlan } from '@/types';

const activityTypes: Record<string, string> = {
  accommodation: '住宿',
  attraction: '景点',
  shopping: '购物',
  entertainment: '娱乐',
  food: '餐饮',
  other: '其它',
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  accommodation: <BedDouble className="w-4 h-4" />,
  attraction: <MapPin className="w-4 h-4" />,
  shopping: <RefreshCw className="w-4 h-4" />,
  entertainment: <Star className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
  other: <Clock className="w-4 h-4" />,
};

const transportIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  taxi: <Car className="w-4 h-4" />,
  walk: <Footprints className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
  other: <Car className="w-4 h-4" />,
};

const transportNames: Record<string, string> = {
  flight: '飞机',
  train: '火车',
  bus: '大巴',
  taxi: '出租车',
  walk: '步行',
  car: '自驾',
  other: '其他',
};

interface TripPlannerProps {
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

const calculateDate = (startDate: string, dayOffset: number): string => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TripPlanner({ confirmedWishes, isAdminMode = false, onEditTripInfo }: TripPlannerProps) {
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTripEditor, setShowTripEditor] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [initializedFromStorage, setInitializedFromStorage] = useState(false);
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWishId = localStorage.getItem('travel-toolbox-selected-wish-id');
      const savedDay = localStorage.getItem('travel-toolbox-selected-day');
      const savedShowSchedule = localStorage.getItem('travel-toolbox-show-schedule');
      const savedDefaultTripId = localStorage.getItem('travel-toolbox-default-trip-id');
      
      if (savedWishId) {
        setSelectedWishId(savedWishId);
      }
      
      if (savedDay) {
        setSelectedDay(parseInt(savedDay, 10));
      }
      
      if (savedShowSchedule === 'true') {
        setShowSchedule(true);
        setShowTripEditor(false);
      }
      
      if (savedDefaultTripId) {
        setDefaultTripId(savedDefaultTripId);
      }
      
      setInitializedFromStorage(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
    }
  }, [selectedWishId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-selected-day', String(selectedDay));
    }
  }, [selectedDay]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-show-schedule', String(showSchedule));
    }
  }, [showSchedule]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (defaultTripId) {
        localStorage.setItem('travel-toolbox-default-trip-id', defaultTripId);
      } else {
        localStorage.removeItem('travel-toolbox-default-trip-id');
      }
    }
  }, [defaultTripId]);

  useEffect(() => {
    if (!initializedFromStorage) return;
    if (loading) return;
    
    if (selectedWishId) {
      const wishExists = confirmedWishes.some(wish => String(wish.id) === selectedWishId);
      if (wishExists) {
        return;
      } else {
        localStorage.removeItem('travel-toolbox-selected-wish-id');
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
      const firstWishWithPlan = confirmedWishes.find(wish => 
        tripPlans.some(plan => plan.wishId === String(wish.id))
      );
      if (firstWishWithPlan) {
        setSelectedWishId(String(firstWishWithPlan.id));
      } else {
        setSelectedWishId(String(confirmedWishes[0].id));
      }
    }
  }, [confirmedWishes, tripPlans, selectedWishId, initializedFromStorage, loading, defaultTripId]);

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

  useEffect(() => {
    const handleTripPlansUpdated = () => {
      fetchTripPlans();
    };
    
    window.addEventListener('tripPlansUpdated', handleTripPlansUpdated);
    
    return () => {
      window.removeEventListener('tripPlansUpdated', handleTripPlansUpdated);
    };
  }, []);

  const createTripPlan = async (wish: Wish) => {
    if (!wish.confirmed_date) return;
    
    try {
      setCreatingTrip(true);
      const response = await fetch('/api/trip-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishId: String(wish.id),
          destination: wish.destination,
          startDate: wish.confirmed_date,
          travelDays: 3,
          travelers: wish.travelers || '未设置',
        }),
      });

      if (response.ok) {
        await fetchTripPlans();
        setSelectedWishId(String(wish.id));
        setShowWishSelector(false);
      } else {
        alert('创建旅行规划失败');
      }
    } catch (error) {
      console.error('[Trip Planner] Failed to create trip plan:', error);
      alert('创建旅行规划失败，请稍后重试');
    } finally {
      setCreatingTrip(false);
    }
  };

  const selectWish = async (wish: Wish) => {
    const existingPlan = tripPlans.find(plan => plan.wishId === String(wish.id));
    
    if (existingPlan) {
      setSelectedWishId(String(wish.id));
      setShowWishSelector(false);
    } else {
      await createTripPlan(wish);
    }
  };

  const currentTripPlan = selectedWishId ? tripPlans.find(plan => plan.wishId === selectedWishId) : null;
  const currentDayPlan = currentTripPlan?.days.find(d => d.dayNumber === selectedDay);

  const getSortedActivities = (activities: ActivityItem[]) => {
    return [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getDateDisplay = (day: number) => {
    if (!currentTripPlan?.startDate) return '';
    return calculateDate(currentTripPlan.startDate, day - 1);
  };

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
                  <option value="car">自驾</option>
                  <option value="other">其它</option>
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
                  <option value="other">其它</option>
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
                  onChange={(e) => setEditingActivityData({ ...editingData, endTime: e.target.value || undefined } as ActivityItem)}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">活动内容 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.content || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, content: e.target.value || undefined } as ActivityItem)}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]"
                  placeholder="活动内容"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60">备注 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.notes || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, notes: e.target.value || undefined } as ActivityItem)}
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
              <p className="text-[#FFFFFF]/60 text-sm mt-1"><MapPin className="w-3 h-3 inline mr-1" /> {activity.location}</p>
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

  if (!currentTripPlan || showWishSelector) {
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
              const hasPlan = tripPlans.some(plan => plan.wishId === String(wish.id));
              const isDefault = defaultTripId === String(wish.id);
              return (
                <div
                  key={wish.id}
                  className={`bg-black/30 border rounded-lg p-4 cursor-pointer hover:bg-black/40 transition-colors ${isDefault ? 'border-[#CEA472]' : 'border-[#CEA472]/20'}`}
                  onClick={() => selectWish(wish)}
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
                      {hasPlan ? (
                        <span className="text-[#CEA472] text-sm">已有规划</span>
                      ) : (
                        <span className="text-[#FFFFFF]/40 text-sm">点击创建规划</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultTripId(String(wish.id));
                        }}
                        className={`p-2 rounded-full transition-colors ${isDefault ? 'text-[#CEA472] hover:bg-[#CEA472]/20' : 'text-[#FFFFFF]/40 hover:text-[#CEA472] hover:bg-[#CEA472]/10'}`}
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

  const sortedActivities = currentDayPlan ? getSortedActivities(currentDayPlan.activities) : [];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-[#CEA472]">
            {currentTripPlan.destination} 旅行规划
          </h3>
          {defaultTripId === selectedWishId && <Star className="w-5 h-5 text-[#CEA472] fill-[#CEA472]" />}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowWishSelector(true)}
          className="bg-black/40 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
          title="切换行程"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div 
        className={`mb-4 p-4 bg-black/30 border border-[#CEA472]/20 rounded-lg ${isAdminMode ? 'cursor-pointer hover:bg-black/40 transition-colors' : ''}`}
        onClick={() => {
          if (isAdminMode && onEditTripInfo) {
            onEditTripInfo({
              id: String(selectedWishId),
              confirmed_date: currentTripPlan.startDate,
              travelDays: currentTripPlan.travelDays,
              travelers: currentTripPlan.travelers,
              destination: currentTripPlan.destination,
            });
          }
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[#FFFFFF] font-medium">
              {currentTripPlan.destination}
            </h4>
            <p className="text-[#FFFFFF]/60 text-sm">
              {currentTripPlan.travelDays}天 · {currentTripPlan.travelers}
            </p>
          </div>
          {isAdminMode && <Edit2 className="w-4 h-4 text-[#CEA472]" />}
        </div>
      </div>

      {showSchedule && (
        <Card className="mb-6 border border-[#CEA472]/20 bg-black/30">
          <CardContent className="pt-4">
            <div className="flex items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#CEA472] flex items-center justify-center shadow-[0_4px_12px_rgba(206,164,114,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <Calendar className="w-5 h-5 text-[#0a0a0f]" />
                </div>
                <h4 className="text-[#CEA472] font-medium">旅行日程表</h4>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[900px] schedule-scroll">
                <div className="flex min-w-max">
                  <div className="w-16 flex-shrink-0 flex flex-col">
                    <div className="h-12 border-b border-[#CEA472]/20"></div>
                    {(() => {
                      let earliestHour = 7;
                      currentTripPlan?.days.forEach(day => {
                        const sortedActivities = getSortedActivities(day.activities);
                        sortedActivities.forEach(activity => {
                          const hour = parseInt(activity.startTime.split(':')[0]);
                          if (hour < earliestHour) earliestHour = hour;
                        });
                        if (day.dayNumber === 1) {
                          const arrival = getArrivalTransport(day);
                          if (arrival) {
                            const depHour = parseInt((arrival.departureTime || arrival.arrivalTime || '07:00').split(':')[0]);
                            if (depHour < earliestHour) earliestHour = depHour;
                            const arrHour = parseInt((arrival.arrivalTime || '07:00').split(':')[0]);
                            if (arrHour < earliestHour) earliestHour = arrHour;
                          }
                        }
                        if (day.dayNumber === currentTripPlan.travelDays) {
                          const departure = getDepartureTransport(day);
                          if (departure) {
                            const depHour = parseInt((departure.departureTime || '07:00').split(':')[0]);
                            if (depHour < earliestHour) earliestHour = depHour;
                            const arrHour = parseInt((departure.arrivalTime || departure.departureTime || '07:00').split(':')[0]);
                            if (arrHour < earliestHour) earliestHour = arrHour;
                          }
                        }
                        sortedActivities.forEach((activity, idx) => {
                          const nextActivity = sortedActivities[idx + 1];
                          if (nextActivity) {
                            const transport = getBetweenTransport(day, activity.id, nextActivity.id);
                            if (transport) {
                              const depHour = parseInt((transport.departureTime || '07:00').split(':')[0]);
                              if (depHour < earliestHour) earliestHour = depHour;
                            }
                          }
                        });
                      });
                      
                      const hoursToShow = Array.from({ length: 24 - earliestHour }, (_, i) => i + earliestHour);
                      
                      return hoursToShow.map(hour => (
                        <div key={hour} className="h-10 border-b border-[#CEA472]/10 text-xs text-[#FFFFFF]/40 px-2 py-1">
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="flex-1 flex">
                    {currentTripPlan?.days.map(day => {
                      const sortedActivities = getSortedActivities(day.activities);
                      const date = getDateDisplay(day.dayNumber);
                      
                      let earliestHour = 7;
                      sortedActivities.forEach(activity => {
                        const hour = parseInt(activity.startTime.split(':')[0]);
                        if (hour < earliestHour) earliestHour = hour;
                      });
                      if (day.dayNumber === 1) {
                        const arrival = getArrivalTransport(day);
                        if (arrival) {
                          const depHour = parseInt((arrival.departureTime || arrival.arrivalTime || '07:00').split(':')[0]);
                          if (depHour < earliestHour) earliestHour = depHour;
                          const arrHour = parseInt((arrival.arrivalTime || '07:00').split(':')[0]);
                          if (arrHour < earliestHour) earliestHour = arrHour;
                        }
                      }
                      if (day.dayNumber === currentTripPlan.travelDays) {
                        const departure = getDepartureTransport(day);
                        if (departure) {
                          const depHour = parseInt((departure.departureTime || '07:00').split(':')[0]);
                          if (depHour < earliestHour) earliestHour = depHour;
                          const arrHour = parseInt((departure.arrivalTime || departure.departureTime || '07:00').split(':')[0]);
                          if (arrHour < earliestHour) earliestHour = arrHour;
                        }
                      }
                      sortedActivities.forEach((activity, idx) => {
                        const nextActivity = sortedActivities[idx + 1];
                        if (nextActivity) {
                          const transport = getBetweenTransport(day, activity.id, nextActivity.id);
                          if (transport) {
                            const depHour = parseInt((transport.departureTime || '07:00').split(':')[0]);
                            if (depHour < earliestHour) earliestHour = depHour;
                          }
                        }
                      });
                      
                      const getTimePosition = (time: string) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return ((hours - earliestHour) * 60 + minutes) * (40 / 60);
                      };
                      
                      const getDuration = (startTime: string, endTime?: string) => {
                        if (!endTime) return 60;
                        const [startHours, startMinutes] = startTime.split(':').map(Number);
                        const [endHours, endMinutes] = endTime.split(':').map(Number);
                        const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                        return Math.max(durationMinutes * (40 / 60), 60);
                      };
                      
                      const mergedItems: Array<{
                        id: string;
                        type: 'arrival' | 'departure' | 'activity';
                        startTime: string;
                        endTime?: string;
                        activity: ActivityItem | null;
                        transportBefore: TransportInfo | null;
                        transportAfter: TransportInfo | null;
                      }> = [];
                      
                      if (day.dayNumber === 1) {
                        const arrival = getArrivalTransport(day);
                        if (arrival) {
                          const firstActivity = sortedActivities[0];
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
                      
                      if (day.dayNumber === currentTripPlan.travelDays) {
                        const departure = getDepartureTransport(day);
                        if (departure) {
                          const lastActivity = sortedActivities[sortedActivities.length - 1];
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
                            {Array.from({ length: 24 - earliestHour }, (_, i) => i + earliestHour).map(hour => (
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
                                  transportText = `${transportNames[transport.type] || transport.type || '交通'}至下一程`;
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
                                const contentParts = [];
                                if (item.activity.content) contentParts.push(item.activity.content);
                                if (item.activity.location) contentParts.push(item.activity.location);
                                subtitle = contentParts.join(' · ');
                                
                                if (item.transportAfter) {
                                  const t = item.transportAfter;
                                  transportText = `${transportNames[t.type] || t.type || '交通'}至下一程`;
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
              <div className="flex items-center gap-2">
                {selectedWishId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDefaultTripId(selectedWishId);
                    }}
                    className={`text-sm ${defaultTripId === selectedWishId ? 'bg-[#CEA472]/20 border-[#CEA472] text-[#CEA472]' : 'bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]/60'}`}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    {defaultTripId === selectedWishId ? '已设为默认' : '设为默认'}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowWishSelector(false)}
                  className="text-[#FFFFFF]/60"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {confirmedWishes.map(wish => {
                const isDefault = defaultTripId === String(wish.id);
                return (
                  <button
                    key={wish.id}
                    onClick={() => {
                      setSelectedWishId(wish.id);
                      setShowWishSelector(false);
                    }}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${selectedWishId === wish.id ? 'bg-[#CEA472]/20 border-[#CEA472] text-[#CEA472]' : 'bg-black/30 border-[#CEA472]/20 text-[#FFFFFF]/80 hover:bg-black/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {wish.destination}
                          {isDefault && <Star className="w-4 h-4 fill-[#CEA472]" />}
                        </div>
                        <div className="text-sm text-[#FFFFFF]/50">
                          {wish.confirmed_date} · {wish.travelers}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {showTripEditor && (
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
              {day === 1 && (
                <div className="space-y-2">
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

              <div className="space-y-4">
                {sortedActivities.length === 0 ? (
                  <div className="text-center py-8 text-[#FFFFFF]/40">
                    暂无活动，点击下方按钮添加
                  </div>
                ) : (
                  sortedActivities.map((activity, index) => (
                    <div key={activity.id} className="space-y-4">
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

                      {renderActivityItem(activity, day)}
                    </div>
                  ))
                )}
              </div>

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
              {day === currentTripPlan.travelDays && (
                <div className="space-y-2 mt-4">
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

              <div className="mt-6">
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
                            <option value="accommodation">住宿</option>
                            <option value="attraction">景点</option>
                            <option value="shopping">购物</option>
                            <option value="entertainment">娱乐</option>
                            <option value="food">餐饮</option>
                            <option value="other">其它</option>
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
            </div>
          </TabsContent>
        ))}
</Tabs>
      )}
      
      <div className="mt-8">
        <Button
          onClick={() => {
            if (showSchedule) {
              setShowSchedule(false);
              setShowTripEditor(true);
            } else {
              setShowSchedule(true);
              setShowTripEditor(false);
            }
          }}
          className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
        >
          {showSchedule ? '编辑日程' : '生成日程表'}
        </Button>
      </div>
    </div>
  );
}
