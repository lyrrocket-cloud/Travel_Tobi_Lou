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
    const savedDay = localStorage.getItem('travel-toolbox-selected-day');
    const savedShowSchedule = localStorage.getItem('travel-toolbox-show-schedule');
    // 读取保存的选中愿望ID（保留上一次的行程）
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
        console.error('[Trip Planner] Failed to fetch default trip:', error);
      } finally {
        // 如果有保存的愿望ID，使用它（包括刷新页面）
        if (savedWishId) {
          setSelectedWishId(savedWishId);
        }
        setInitializedFromStorage(true);
      }
    };
    
    if (savedDay) {
      setSelectedDay(parseInt(savedDay, 10));
    }
    
    if (savedShowSchedule === 'true') {
      setShowSchedule(true);
      setShowTripEditor(false);
    }
    
    fetchDefaultTrip();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-selected-day', String(selectedDay));
    }
  }, [selectedDay]);

  // 保存选中的旅行到 localStorage（用于切换标签页后恢复）
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
    }
  }, [selectedWishId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-show-schedule', String(showSchedule));
    }
  }, [showSchedule]);

  useEffect(() => {
    if (typeof window !== 'undefined' && initializedFromStorage && defaultTripId) {
      localStorage.setItem('travel-toolbox-default-trip-id', defaultTripId);
    }
  }, [defaultTripId, initializedFromStorage]);

  useEffect(() => {
    if (!initializedFromStorage) return;
    if (loading) return;
    if (confirmedWishes.length === 0) return;

    // 如果已经有有效的 selectedWishId，不覆盖它
    // 这是为了支持从外部（如时间轴）导航到特定的旅行
    if (selectedWishId) {
      return;
    }

    // 然后尝试使用默认旅行ID
    if (defaultTripId) {
      const defaultWishExists = confirmedWishes.some(wish => String(wish.id) === defaultTripId);
      if (defaultWishExists) {
        setSelectedWishId(defaultTripId);
        return;
      }
    }

    // 最后选择第一个有行程计划的旅行或第一个旅行
    const firstWishWithPlan = confirmedWishes.find(wish =>
      tripPlans.some(plan => plan.wishId === String(wish.id))
    );
    if (firstWishWithPlan) {
      setSelectedWishId(String(firstWishWithPlan.id));
    } else {
      setSelectedWishId(String(confirmedWishes[0].id));
    }
  }, [initializedFromStorage, loading, confirmedWishes, defaultTripId, tripPlans]);

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

  // 监听自定义事件，确保同步更新
  useEffect(() => {
    const handleDefaultTripChanged = (e: any) => {
      if (e.detail && e.detail.defaultTripId) {
        setDefaultTripId(e.detail.defaultTripId);
      }
    };

    const handleSelectedWishChanged = (e: any) => {
      if (e.detail && e.detail.wishId) {
        const wishId = e.detail.wishId;
        // 直接信任外部设置的 selectedWishId
        setSelectedWishId(wishId);
        // 确保初始化完成
        if (!initializedFromStorage) {
          setInitializedFromStorage(true);
        }
      }
    };

    window.addEventListener('default-trip-changed', handleDefaultTripChanged as EventListener);
    window.addEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    return () => {
      window.removeEventListener('default-trip-changed', handleDefaultTripChanged as EventListener);
      window.removeEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    };
  }, [initializedFromStorage, confirmedWishes]);

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

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const addTransport = async (dayNumber: number, position: 'arrival' | 'departure' | 'between', beforeActivityId?: string, afterActivityId?: string) => {
    if (!currentTripPlan) return;

    let from = '';
    let to = '';
    let departureTime = '';
    const dayPlan = currentTripPlan.days.find(d => d.dayNumber === dayNumber);

    if (position === 'arrival') {
      to = currentTripPlan.destination;
    } else if (position === 'departure') {
      from = currentTripPlan.destination;
    } else if (position === 'between' && dayPlan) {
        const arrivalTransport = dayPlan.transport.find(t => t.position === 'arrival');
        const departureTransport = dayPlan.transport.find(t => t.position === 'departure');

        if (beforeActivityId === 'arrival') {
          // 到达→活动：出发地为到达交通的目的地，目的地为活动地点
          from = arrivalTransport?.to || '';
          const firstActivity = dayPlan.activities.find(a => a.id === afterActivityId);
          to = firstActivity?.location || '';
          if (firstActivity) {
            if (firstActivity.startTime) {
              departureTime = addMinutesToTime(firstActivity.startTime, -30);
            }
          }
        } else if (afterActivityId === 'departure') {
          // 活动→离开：出发地为活动地点，目的地为离开交通的出发地
          const lastActivity = dayPlan.activities.find(a => a.id === beforeActivityId);
          from = lastActivity?.location || '';
          to = departureTransport?.from || '';
          if (lastActivity) {
            if (lastActivity.endTime) {
              departureTime = lastActivity.endTime;
            } else if (lastActivity.startTime) {
              departureTime = addMinutesToTime(lastActivity.startTime, 1);
            }
          }
        } else if (afterActivityId === 'arrival') {
          // 活动→到达：出发地为活动地点，目的地为到达交通的出发地
          const beforeActivity = dayPlan.activities.find(a => a.id === beforeActivityId);
          from = beforeActivity?.location || '';
          to = arrivalTransport?.from || '';
          if (beforeActivity) {
            if (beforeActivity.endTime) {
              departureTime = beforeActivity.endTime;
            } else if (beforeActivity.startTime) {
              departureTime = addMinutesToTime(beforeActivity.startTime, 1);
            }
          }
        } else if (beforeActivityId === 'departure') {
          // 离开→活动：出发地为离开交通的目的地，目的地为活动地点
          const afterActivity = dayPlan.activities.find(a => a.id === afterActivityId);
          from = departureTransport?.to || '';
          to = afterActivity?.location || '';
          if (afterActivity) {
            if (afterActivity.startTime) {
              departureTime = addMinutesToTime(afterActivity.startTime, -30);
            }
          }
        } else {
          const beforeActivity = dayPlan.activities.find(a => a.id === beforeActivityId);
          const afterActivity = dayPlan.activities.find(a => a.id === afterActivityId);
          from = beforeActivity?.location || '';
          to = afterActivity?.location || '';
          if (beforeActivity) {
            if (beforeActivity.endTime) {
              departureTime = beforeActivity.endTime;
            } else if (beforeActivity.startTime) {
              departureTime = addMinutesToTime(beforeActivity.startTime, 1);
            }
          }
        }
      }

    const transportId = `transport-${Date.now()}`;
    const newTransport: TransportInfo = {
      id: transportId,
      type: 'taxi',
      from,
      to,
      departureTime,
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
        <Card key={transport.id} className="border border-[#CEA472]/20 bg-black/40">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">交通方式</Label>
                <select
                  value={editingData.type}
                  onChange={(e) => setEditingTransportData({ ...editingData, type: e.target.value })}
                  className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3 text-xs"
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
                <Label className="text-[#FFFFFF]/60 text-xs">出发地</Label>
                <Input
                  value={editingData.from}
                  onChange={(e) => setEditingTransportData({ ...editingData, from: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="从哪里出发"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">目的地</Label>
                <Input
                  value={editingData.to}
                  onChange={(e) => setEditingTransportData({ ...editingData, to: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="到哪里去"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">出发时间</Label>
                <Input
                  type="time"
                  value={editingData.departureTime || ''}
                  onChange={(e) => setEditingTransportData({ ...editingData, departureTime: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                />
              </div>
              {(transport.position === 'arrival' || transport.position === 'departure') && (
                <div>
                  <Label className="text-[#FFFFFF]/60 text-xs">到达时间</Label>
                  <Input
                    type="time"
                    value={editingData.arrivalTime || ''}
                    onChange={(e) => setEditingTransportData({ ...editingData, arrivalTime: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60 text-xs">备注</Label>
                <Input
                  value={editingData.details || ''}
                  onChange={(e) => setEditingTransportData({ ...editingData, details: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="其他说明信息"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteTransport(day, transport.id)}
                className="text-red-500 hover:text-red-400 hover:bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (editingTransportData) {
                    updateTransportData(day, transport.id, editingTransportData);
                  }
                }}
                className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent"
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
        className="bg-black/40 border border-[#CEA472]/20 rounded-md p-3 cursor-pointer hover:bg-black/50 transition-colors"
        onClick={() => {
          setEditingTransport({ dayNumber: day, transportId: transport.id });
          setEditingTransportData({ ...transport });
        }}
      >
        <div className="flex items-center gap-2 text-[#CEA472]">
          {transportIcons[transport.type] || transportIcons['other']}
          <span className="font-medium text-xs">{transportNames[transport.type] || '未设置'}</span>
        </div>
        {(transport.from || transport.to) && (
          <div className="text-[#FFFFFF]/80 text-xs mt-1 flex items-center gap-2">
            {transport.from && <span>{transport.from}</span>}
            {transport.from && transport.to && <ArrowRight className="w-3 h-3" />}
            {transport.to && <span>{transport.to}</span>}
          </div>
        )}
        {transport.departureTime && (
          <div className="text-[#FFFFFF]/60 text-xs mt-1">
            <span>出发: {transport.departureTime}</span>
            {transport.arrivalTime && (transport.position === 'arrival' || transport.position === 'departure') && (
              <span className="ml-2">到达: {transport.arrivalTime}</span>
            )}
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
        <Card key={activity.id} className="border border-[#CEA472]/20 bg-black/40">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">活动类型</Label>
                <select
                  value={editingData.type}
                  onChange={(e) => setEditingActivityData({ ...editingData, type: e.target.value })}
                  className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3 text-xs"
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
                <Label className="text-[#FFFFFF]/60 text-xs">地点</Label>
                <Input
                  value={editingData.location || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, location: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="活动地点"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">开始时间</Label>
                <Input
                  type="time"
                  value={editingData.startTime}
                  onChange={(e) => setEditingActivityData({ ...editingData, startTime: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 text-xs">结束时间 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  type="time"
                  value={editingData.endTime || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, endTime: e.target.value || undefined } as ActivityItem)}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60 text-xs">活动内容 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.content || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, content: e.target.value || undefined } as ActivityItem)}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="活动内容"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[#FFFFFF]/60 text-xs">备注 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                <Input
                  value={editingData.notes || ''}
                  onChange={(e) => setEditingActivityData({ ...editingData, notes: e.target.value || undefined } as ActivityItem)}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                  placeholder="备注"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteActivity(day, activity.id)}
                className="text-red-500 hover:text-red-400 hover:bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (editingActivityData) {
                    updateActivityData(day, activity.id, editingActivityData);
                  }
                }}
                className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent"
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
        className="bg-black/40 border border-[#CEA472]/20 rounded-md p-3.5 sm:p-4 cursor-pointer hover:bg-black/50 transition-colors"
        onClick={() => {
          setEditingActivity({ dayNumber: day, activityId: activity.id });
          setEditingActivityData({ ...activity });
        }}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#CEA472]/20 flex items-center justify-center">
            {activityTypeIcons[activity.type] || activityTypeIcons['other']}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[#CEA472] font-medium text-xs">{activityTypes[activity.type]}</span>
              <span className="text-[#FFFFFF]/60 text-xs">
                {activity.startTime}
                {activity.endTime && ` - ${activity.endTime}`}
              </span>
            </div>
            {activity.content && (
              <p className="text-[#FFFFFF] mt-1 text-xs">{activity.content}</p>
            )}
            {activity.location && (
              <p className="text-[#FFFFFF]/60 text-xs mt-1"><MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" /> {activity.location}</p>
            )}
            {activity.notes && (
              <p className="text-[#FFFFFF]/40 text-[10px] sm:text-xs mt-1 truncate">{activity.notes}</p>
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
      <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-0">
        <div className="flex items-center mb-5">
          <h3 className="text-lg sm:text-xl font-semibold text-[#CEA472]">选择旅行</h3>
        </div>

        {confirmedWishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#FFFFFF]/60 text-xs">暂无已确认成行的愿望</div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {confirmedWishes.map(wish => {
              const hasPlan = tripPlans.some(plan => plan.wishId === String(wish.id));
              const isDefault = defaultTripId === String(wish.id);
              return (
                <div
                  key={wish.id}
                  className={`bg-black/40 border rounded-lg p-3.5 sm:p-4 cursor-pointer hover:bg-black/50 transition-colors ${isDefault ? 'border-[#CEA472]' : 'border-[#CEA472]/20'}`}
                  onClick={() => selectWish(wish)}
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
                      {hasPlan ? (
                        <span className="text-[#CEA472] text-xs">已有规划</span>
                      ) : (
                        <span className="text-[#FFFFFF]/40 text-xs">点击创建</span>
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

  const sortedActivities = currentDayPlan ? getSortedActivities(currentDayPlan.activities) : [];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-[#CEA472] truncate">
            {currentTripPlan.destination} 旅行规划
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowWishSelector(true)}
          className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent"
          title="切换行程"
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>

      <div 
        className={`mb-4 p-3.5 sm:p-4 bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg ${isAdminMode ? 'cursor-pointer hover:bg-black/50 transition-colors' : ''}`}
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
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-[#FFFFFF] font-medium text-xs truncate">
              {currentTripPlan.destination}
            </h4>
            <p className="text-[#FFFFFF]/60 text-xs mt-0.5">
              {currentTripPlan.travelDays}天 · {currentTripPlan.travelers}
            </p>
          </div>
          {isAdminMode && <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472] flex-shrink-0 mt-0.5" />}
        </div>
      </div>

      {showSchedule && (
        <Card className="mb-4 sm:mb-6 border border-[#CEA472]/20 bg-black/40">
          <CardContent className="pt-3 sm:pt-4">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#CEA472] flex items-center justify-center shadow-[0_4px_12px_rgba(206,164,114,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#0a0a0f]" />
                </div>
                <h4 className="text-[#CEA472] font-medium text-sm sm:text-base">旅行日程表</h4>
              </div>
            </div>
            {/* Day切换按钮 - 手机端 */}
            {currentTripPlan && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-thin sm:hidden">
                {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedDay === day
                        ? 'bg-[#CEA472] text-[#0a0a0f]'
                        : 'bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]/60 hover:border-[#CEA472]/60'
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            )}
              
              <div>
              <div className="overflow-y-auto max-h-[600px] sm:max-h-[900px] schedule-scroll">
                <div className="flex min-w-max">
                  {/* 时间轴 - 仅桌面端显示 */}
                  <div className="w-12 sm:w-16 flex-shrink-0 flex flex-col">
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
                    {currentTripPlan?.days
                      .filter(day => {
                        // 手机端只显示选中的Day，桌面端显示所有
                        if (typeof window !== 'undefined' && window.innerWidth < 640) {
                          return day.dayNumber === selectedDay;
                        }
                        return true;
                      })
                      .map(day => {
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
                      
                      const allItems: Array<{
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
                          
                          allItems.push({
                            id: 'arrival',
                            type: 'arrival',
                            startTime: arrivalStartTime,
                            endTime: arrivalEndTime,
                            activity: null,
                            transportBefore: null,
                            transportAfter: null,
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
                        
                        allItems.push({
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
                          const departureStartTime = departure.departureTime || lastActivity?.endTime || '23:00';
                          const departureEndTime = departure.departureTime || '23:00';
                          
                          allItems.push({
                            id: 'departure',
                            type: 'departure',
                            startTime: departureStartTime,
                            endTime: departureEndTime,
                            activity: null,
                            transportBefore: null,
                            transportAfter: null,
                          });
                        }
                      }
                      
                      allItems.sort((a, b) => {
                        return a.startTime.localeCompare(b.startTime);
                      });
                      
                      allItems.forEach((item, index) => {
                        let transportBefore = item.transportBefore;
                        let transportAfter = item.transportAfter;
                        
                        if (item.type === 'arrival') {
                          const nextItem = allItems[index + 1];
                          if (nextItem && nextItem.type === 'activity') {
                            transportAfter = getBetweenTransport(day, 'arrival', nextItem.activity!.id) || null;
                          }
                        } else if (item.type === 'departure') {
                          const prevItem = allItems[index - 1];
                          if (prevItem && prevItem.type === 'activity') {
                            transportBefore = getBetweenTransport(day, prevItem.activity!.id, 'departure') || null;
                          }
                        } else if (item.type === 'activity') {
                          const prevItem = allItems[index - 1];
                          const nextItem = allItems[index + 1];
                          
                          if (prevItem) {
                            if (prevItem.type === 'activity') {
                              transportBefore = getBetweenTransport(day, prevItem.activity!.id, item.activity!.id) || null;
                            } else if (prevItem.type === 'arrival') {
                              transportBefore = getBetweenTransport(day, 'arrival', item.activity!.id) || null;
                            }
                          }
                          
                          if (nextItem) {
                            if (nextItem.type === 'activity') {
                              transportAfter = getBetweenTransport(day, item.activity!.id, nextItem.activity!.id) || null;
                            } else if (nextItem.type === 'departure') {
                              transportAfter = getBetweenTransport(day, item.activity!.id, 'departure') || null;
                            }
                          }
                        }
                        
                        mergedItems.push({
                          ...item,
                          transportBefore,
                          transportAfter,
                        });
                      });
                      
                      return (
                        <div key={day.id} className="flex-1 min-w-[140px] sm:min-w-[160px] max-w-[180px] sm:max-w-[200px] flex flex-col border-l border-[#CEA472]/20">
                          <div className="h-12 border-b border-[#CEA472]/20 p-1.5 sm:p-2 text-center">
                            <div className="text-[#CEA472] font-medium text-xs">Day {day.dayNumber}</div>
                            {date && <div className="text-[#FFFFFF]/60 text-[10px] sm:text-xs">{date}</div>}
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
                                  className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 ${bgColor} border ${borderColor} rounded-md p-1 sm:p-1.5 overflow-hidden`}
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
        <Card className="mb-6 border border-[#CEA472]/20 bg-black/40">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[#CEA472] font-medium">选择愿望</h4>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowWishSelector(false)}
                  className="text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 hover:bg-transparent"
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
                    className={`w-full text-left p-3 rounded-md border transition-colors ${selectedWishId === wish.id ? 'bg-[#CEA472]/20 border-[#CEA472] text-[#CEA472]' : 'bg-black/40 border-[#CEA472]/20 text-[#FFFFFF]/80 hover:bg-black/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {wish.destination}
                        </div>
                        <div className="text-xs text-[#FFFFFF]/50">
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
        <TabsList className="inline-flex h-[48px] sm:h-[56px] bg-black/40 backdrop-blur-sm border border-[#CEA472]/20 rounded-lg p-1 gap-1 w-full justify-start overflow-x-auto">
          {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
            <TabsTrigger
              key={day}
              value={String(day)}
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 flex flex-col items-center justify-center px-3 sm:px-4 rounded-md transition-all duration-300 min-w-[70px] sm:min-w-[80px] h-full"
            >
              <span className="text-xs font-medium whitespace-nowrap">Day {day}</span>
              {getDateDisplay(day) && (
                <span className="text-[10px] sm:text-xs opacity-70 whitespace-nowrap hidden sm:inline">{getDateDisplay(day)}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: currentTripPlan.travelDays }, (_, i) => i + 1).map(day => (
          <TabsContent key={day} value={String(day)} className="mt-6">
            <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
              {/* 构建按时间排序的统一列表 */}
              {(() => {
                type ItemType = 'arrival' | 'departure' | 'activity';
                type SortableItem = {
                  type: ItemType;
                  sortTime: string;
                  activity?: ActivityItem;
                  transport?: TransportInfo;
                  beforeActivityId?: string;
                  afterActivityId?: string;
                };
                
                const items: SortableItem[] = [];
                const dayPlan = currentTripPlan?.days.find(d => d.dayNumber === day);
                
                // 添加到达行程（第1天）
                if (day === 1) {
                  const arrival = dayPlan ? getArrivalTransport(dayPlan) : null;
                  if (arrival) {
                    items.push({
                      type: 'arrival',
                      sortTime: arrival.departureTime || arrival.arrivalTime || '00:00',
                      transport: arrival,
                      afterActivityId: sortedActivities[0]?.id,
                    });
                  }
                }
                
                // 添加活动
                sortedActivities.forEach((activity, index) => {
                  items.push({
                    type: 'activity',
                    sortTime: activity.startTime,
                    activity: activity,
                    beforeActivityId: index > 0 ? sortedActivities[index - 1].id : (day === 1 && dayPlan && getArrivalTransport(dayPlan) ? 'arrival' : undefined),
                    afterActivityId: index < sortedActivities.length - 1 ? sortedActivities[index + 1].id : (day === currentTripPlan.travelDays && dayPlan && getDepartureTransport(dayPlan) ? 'departure' : undefined),
                  });
                });
                
                // 添加离开行程（最后一天）
                if (day === currentTripPlan.travelDays) {
                  const departure = dayPlan ? getDepartureTransport(dayPlan) : null;
                  if (departure) {
                    items.push({
                      type: 'departure',
                      sortTime: departure.departureTime || '23:00',
                      transport: departure,
                      beforeActivityId: sortedActivities[sortedActivities.length - 1]?.id,
                    });
                  }
                }
                
                // 按时间排序
                items.sort((a, b) => a.sortTime.localeCompare(b.sortTime));
                
                // 排序后重新计算前后关系
                items.forEach((item, index) => {
                  if (item.type === 'activity') {
                    // 找排序后的前一个 item
                    for (let i = index - 1; i >= 0; i--) {
                      const prevItem = items[i];
                      if (prevItem.type === 'activity') {
                        item.beforeActivityId = prevItem.activity!.id;
                        break;
                      } else if (prevItem.type === 'arrival') {
                        item.beforeActivityId = 'arrival';
                        break;
                      }
                    }
                    // 找排序后的后一个 item
                    for (let i = index + 1; i < items.length; i++) {
                      const nextItem = items[i];
                      if (nextItem.type === 'activity') {
                        item.afterActivityId = nextItem.activity!.id;
                        break;
                      } else if (nextItem.type === 'departure') {
                        item.afterActivityId = 'departure';
                        break;
                      }
                    }
                  } else if (item.type === 'arrival') {
                    // 找排序后的后一个 item
                    for (let i = index + 1; i < items.length; i++) {
                      const nextItem = items[i];
                      if (nextItem.type === 'activity') {
                        item.afterActivityId = nextItem.activity!.id;
                        break;
                      } else if (nextItem.type === 'departure') {
                        item.afterActivityId = 'departure';
                        break;
                      }
                    }
                  } else if (item.type === 'departure') {
                    // 找排序后的前一个 item
                    for (let i = index - 1; i >= 0; i--) {
                      const prevItem = items[i];
                      if (prevItem.type === 'activity') {
                        item.beforeActivityId = prevItem.activity!.id;
                        break;
                      } else if (prevItem.type === 'arrival') {
                        item.beforeActivityId = 'arrival';
                        break;
                      }
                    }
                    // 找排序后的后一个 item（活动在离开之后时）
                    for (let i = index + 1; i < items.length; i++) {
                      const nextItem = items[i];
                      if (nextItem.type === 'activity') {
                        item.afterActivityId = nextItem.activity!.id;
                        break;
                      }
                    }
                  }
                });
                
                if (items.length === 0) {
                  return (
                    <div className="text-center py-8 text-[#FFFFFF]/40 text-xs">
                      暂无活动，点击下方按钮添加
                    </div>
                  );
                }
                
                return <div className="space-y-4">{items.map((item, index) => {
                  if (item.type === 'arrival') {
                    const transport = item.transport!;
                    const prevItem = items[index - 1];
                    return (
                      <div key="arrival" className="space-y-4">
                        {/* 到达前的交通（当前一个是活动时） */}
                        {prevItem && prevItem.type === 'activity' && prevItem.activity && dayPlan && (
                          <div className="pl-8 space-y-2">
                            {getBetweenTransport(dayPlan, prevItem.activity.id, 'arrival') ? (
                              renderTransportItem(getBetweenTransport(dayPlan, prevItem.activity.id, 'arrival')!, day)
                            ) : (
                              <Button
                                onClick={() => addTransport(day, 'between', prevItem.activity!.id, 'arrival')}
                                variant="outline"
                                className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                添加交通
                              </Button>
                            )}
                          </div>
                        )}
                        {renderTransportItem(transport, day)}
                      </div>
                    );
                  } else if (item.type === 'departure') {
                    const prevItem = items[index - 1];
                    return (
                      <div key="departure" className="space-y-4">
                        {renderTransportItem(item.transport!, day)}
                        {/* 离开后的交通（当有活动在离开时间之后时） */}
                        {item.afterActivityId && dayPlan && (
                          <div className="pl-8 space-y-2">
                            {getBetweenTransport(dayPlan, 'departure', item.afterActivityId) ? (
                              renderTransportItem(getBetweenTransport(dayPlan, 'departure', item.afterActivityId)!, day)
                            ) : (
                              <Button
                                onClick={() => addTransport(day, 'between', 'departure', item.afterActivityId)}
                                variant="outline"
                                className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                添加交通
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  } else if (item.activity) {
                    const activity = item.activity;
                    const prevItem = items[index - 1];
                    const nextItem = items[index + 1];
                    
                    return (
                      <div key={activity.id} className="space-y-4">
                        {/* 活动前的交通（仅当前一个是到达时） */}
                        {prevItem && prevItem.type === 'arrival' && dayPlan && (
                          <div className="pl-8 space-y-2">
                            {getBetweenTransport(dayPlan, 'arrival', activity.id) ? (
                              renderTransportItem(getBetweenTransport(dayPlan, 'arrival', activity.id)!, day)
                            ) : (
                              <Button
                                onClick={() => addTransport(day, 'between', 'arrival', activity.id)}
                                variant="outline"
                                className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                添加交通
                              </Button>
                            )}
                          </div>
                        )}
                        {renderActivityItem(activity, day)}
                        {/* 活动后的交通（当下一个是活动或离开时） */}
                        {nextItem && (nextItem.type === 'activity' || nextItem.type === 'departure') && dayPlan && (
                          <div className="pl-8 space-y-2">
                            {(nextItem.type === 'activity' 
                              ? getBetweenTransport(dayPlan, activity.id, nextItem.activity!.id) 
                              : getBetweenTransport(dayPlan, activity.id, 'departure')
                            ) ? (
                              renderTransportItem(
                                nextItem.type === 'activity' 
                                  ? getBetweenTransport(dayPlan, activity.id, nextItem.activity!.id)! 
                                  : getBetweenTransport(dayPlan, activity.id, 'departure')!,
                                day
                              )
                            ) : (
                              <Button
                                onClick={() => addTransport(
                                  day, 
                                  'between', 
                                  activity.id, 
                                  nextItem.type === 'activity' ? nextItem.activity!.id : 'departure'
                                )}
                                variant="outline"
                                className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                添加交通
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}</div>;
              })()}
              
              {/* 添加到达按钮（第1天，如果没有到达） */}
              {day === 1 && (!currentDayPlan || !getArrivalTransport(currentDayPlan)) && (
                <Button
                  onClick={() => addTransport(day, 'arrival')}
                  variant="outline"
                  className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加到达
                </Button>
              )}
              
              {/* 添加离开按钮（最后一天，如果没有离开） */}
              {day === currentTripPlan.travelDays && (!currentDayPlan || !getDepartureTransport(currentDayPlan)) && (
                <Button
                  onClick={() => addTransport(day, 'departure')}
                  variant="outline"
                  className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加离开
                </Button>
              )}
              
              {/* 添加活动按钮 */}
              {showAddActivity ? (
                <div className="mt-4">
                  <div className="border border-[#CEA472]/20 bg-black/40 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[#CEA472] font-medium text-xs">添加新活动</h4>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowAddActivity(false)}
                        className="text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 hover:bg-transparent"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#FFFFFF]/60 text-xs">活动类型</Label>
                        <select
                          value={newActivity.type}
                          onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                          className="w-full h-10 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3 text-xs"
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
                        <Label className="text-[#FFFFFF]/60 text-xs">地点</Label>
                          <Input
                            value={newActivity.location || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                            placeholder="活动地点"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60 text-xs">开始时间</Label>
                          <Input
                            type="time"
                            value={newActivity.startTime}
                            onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FFFFFF]/60 text-xs">结束时间 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            type="time"
                            value={newActivity.endTime || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[#FFFFFF]/60 text-xs">活动内容 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            value={newActivity.content || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, content: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                            placeholder="活动内容"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[#FFFFFF]/60 text-xs">备注 <span className="text-[#FFFFFF]/40">(可选)</span></Label>
                          <Input
                            value={newActivity.notes || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value || undefined })}
                            className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs"
                            placeholder="备注"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={addActivity}
                          className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-transparent"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAddActivity(true)}
                    variant="outline"
                    className="w-full justify-start bg-black/40 border border-[#CEA472]/20 hover:bg-[#CEA472]/10 text-[#FFFFFF]/60 text-xs mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加活动
                  </Button>
                )}
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
