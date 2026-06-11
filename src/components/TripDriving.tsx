'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Car, Navigation, Clock, TrendingUp, Award, MapPin, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wish, TripDrivingRecord, DrivingRecordItem, DrivingBehavior, DriverStatistics } from '@/types';
import { TripPlan } from '@/types';

// 驾驶行为配置
const drivingBehaviors: Record<string, { icon: React.ReactNode; label: string; score: number; color: string }> = {
  normal: { icon: <Car className="w-4 h-4" />, label: '正常驾驶', score: 0, color: 'text-blue-400' },
  speeding: { icon: <TrendingUp className="w-4 h-4" />, label: '超速', score: -10, color: 'text-red-500' },
  harsh_brake: { icon: <Car className="w-4 h-4" />, label: '急刹车', score: -5, color: 'text-orange-500' },
  rapid_accelerate: { icon: <TrendingUp className="w-4 h-4" />, label: '急加速', score: -3, color: 'text-yellow-500' },
  fatigue: { icon: <Clock className="w-4 h-4" />, label: '疲劳驾驶', score: -15, color: 'text-red-600' },
  phone_use: { icon: <Car className="w-4 h-4" />, label: '使用手机', score: -10, color: 'text-purple-500' },
  lane_violation: { icon: <Navigation className="w-4 h-4" />, label: '变道违规', score: -5, color: 'text-orange-400' },
  red_light: { icon: <Car className="w-4 h-4" />, label: '闯红灯', score: -20, color: 'text-red-700' },
};

interface TripDrivingProps {
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

export default function TripDriving({ confirmedWishes, isAdminMode = false, onEditTripInfo }: TripDrivingProps) {
  const [tripDrivingRecords, setTripDrivingRecords] = useState<TripDrivingRecord[]>([]);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('entry');
  const [showAddDriving, setShowAddDriving] = useState(false);
  const [showEditDriving, setShowEditDriving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DrivingRecordItem | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializedFromStorage, setInitializedFromStorage] = useState(false);

  const [newDrivingRecord, setNewDrivingRecord] = useState<{
    date: string;
    time: string;
    driver: string;
    startLocation: string;
    endLocation: string;
    distance: string;
    duration: string;
    behaviors: DrivingBehavior[];
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    driver: '',
    startLocation: '',
    endLocation: '',
    distance: '',
    duration: '',
    behaviors: [],
  });

  const [analysisDriverFilter, setAnalysisDriverFilter] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const fetchDrivingRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trip-driving');
      const data = await response.json();
      const records = data.tripDrivingRecords || [];
      setTripDrivingRecords(records);
      return records;
    } catch (error) {
      console.error('[Trip Driving] Error fetching driving records:', error);
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
      console.error('[Trip Driving] Error fetching trip plans:', error);
    }
  };

  const currentDrivingRecord = selectedWishId ? 
    tripDrivingRecords.find(record => String(record.wishId) === String(selectedWishId)) : null;

  const currentTripPlan = selectedWishId ?
    tripPlans.find(p => String(p.wishId) === String(selectedWishId)) : null;

  // 从旅行规划中提取自驾交通路线
  const selfDrivingRoutes = currentTripPlan?.days?.flatMap(day => {
    return day.transport
      ?.filter(t => t.type === 'car' || t.type === '自驾')
      .map(t => ({
        id: t.id,
        day: `Day${day.dayNumber}`,
        from: t.from,
        to: t.to,
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
      })) || [];
  }) || [];

  useEffect(() => {
    // 读取保存的选中愿望ID（与 TripPlanner/TripAccounting 共享，保留上一次的行程）
    const savedWishId = localStorage.getItem('travel-toolbox-selected-wish-id');
    
    // 如果有保存的愿望ID，使用它（包括刷新页面）
    if (savedWishId) {
      setSelectedWishId(savedWishId);
    }
    setInitializedFromStorage(true);
  }, []);

  // 保存选中的旅行到 localStorage（与 TripPlanner/TripAccounting 共享）
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
    }
  }, [selectedWishId, initializedFromStorage]);

  useEffect(() => {
    console.debug('[Trip Driving] Initializing...');
    Promise.all([
      fetchDrivingRecords(),
      fetchTripPlans(),
    ]).then(() => {
      console.debug('[Trip Driving] Data loaded');
    });
  }, []);

  useEffect(() => {
    if (!initializedFromStorage) return;
    if (loading) return;
    if (confirmedWishes.length === 0) return;
    
    if (selectedWishId) {
      const wishExists = confirmedWishes.some(wish => String(wish.id) === selectedWishId);
      if (wishExists) {
        return;
      }
    }
    
    const firstWishWithRecord = confirmedWishes.find(wish => 
      tripDrivingRecords.some(record => String(record.wishId) === String(wish.id))
    );
    if (firstWishWithRecord) {
      setSelectedWishId(String(firstWishWithRecord.id));
    } else {
      const firstWish = confirmedWishes[0];
      const hasRecord = tripDrivingRecords.some(record => String(record.wishId) === String(firstWish.id));
      if (!hasRecord) {
        fetch('/api/trip-driving', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wishId: String(firstWish.id),
            destination: firstWish.destination,
            startDate: firstWish.confirmed_date,
          }),
        }).then(response => {
          if (response.ok) {
            fetchDrivingRecords();
          }
        }).catch(error => {
          console.error('[Trip Driving] Error creating driving record:', error);
        });
      }
      setSelectedWishId(String(firstWish.id));
    }
  }, [confirmedWishes, tripDrivingRecords, selectedWishId, initializedFromStorage, loading]);

  const createDrivingRecord = async (wish: Wish) => {
    try {
      const response = await fetch('/api/trip-driving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishId: String(wish.id),
          destination: wish.destination,
          startDate: wish.confirmed_date,
        }),
      });

      if (response.ok) {
        await fetchDrivingRecords();
        setSelectedWishId(String(wish.id));
        setShowWishSelector(false);
      }
    } catch (error) {
      console.error('[Trip Driving] Error creating driving record:', error);
    }
  };

  const calculateScore = (behaviors: DrivingBehavior[], distance?: number, duration?: number): number => {
    // 驾驶行为评分
    const behaviorScore = behaviors.reduce((total, behavior) => {
      return total + (drivingBehaviors[behavior]?.score || 0);
    }, 0);
    
    // 距离积分：每公里1分
    const distanceScore = distance ? Math.floor(distance) : 0;
    
    // 时长积分：每分钟1分
    const durationScore = duration ? Math.floor(duration) : 0;
    
    // 总积分
    return behaviorScore + distanceScore + durationScore;
  };

  const addDrivingRecord = async () => {
    // 验证必填字段
    if (!newDrivingRecord.driver) {
      console.error('[Trip Driving] Driver is required');
      return;
    }
    if (!newDrivingRecord.startLocation || !newDrivingRecord.endLocation) {
      console.error('[Trip Driving] Start and end locations are required');
      return;
    }
    
    // 获取目标记录
    let targetRecord = tripDrivingRecords.find(r => String(r.wishId) === String(selectedWishId));
    
    // 如果没有记录，先创建
    if (!targetRecord && selectedWishId) {
      const wish = confirmedWishes.find(w => String(w.id) === selectedWishId);
      if (wish) {
        try {
          const createResponse = await fetch('/api/trip-driving', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wishId: String(wish.id),
              destination: wish.destination,
              startDate: wish.confirmed_date,
            }),
          });

          if (createResponse.ok) {
            // 等待数据更新
            await fetchDrivingRecords();
            targetRecord = tripDrivingRecords.find(r => String(r.wishId) === String(selectedWishId));
          } else {
            const errorText = await createResponse.text();
            console.error('[Trip Driving] Failed to create driving record:', createResponse.status, errorText);
            return;
          }
        } catch (error) {
          console.error('[Trip Driving] Error creating driving record:', error);
          return;
        }
      }
    }
    
    if (!targetRecord) {
      console.error('[Trip Driving] No driving record available');
      return;
    }

    const distance = newDrivingRecord.distance ? parseFloat(newDrivingRecord.distance) : undefined;
      const duration = newDrivingRecord.duration ? parseFloat(newDrivingRecord.duration) : undefined;
      
      const drivingRecordItem: DrivingRecordItem = {
        id: `driving-${Date.now()}`,
        wishId: targetRecord.wishId,
        date: newDrivingRecord.date,
        time: newDrivingRecord.time,
        driver: newDrivingRecord.driver,
        startLocation: newDrivingRecord.startLocation,
        endLocation: newDrivingRecord.endLocation,
        distance,
        duration,
        score: calculateScore(newDrivingRecord.behaviors, distance, duration),
        behaviors: newDrivingRecord.behaviors.map(behavior => ({
          type: behavior,
          timestamp: `${newDrivingRecord.date} ${newDrivingRecord.time}`,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    try {
      const response = await fetch('/api/trip-driving', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetRecord.id,
          records: [...targetRecord.records, drivingRecordItem],
        }),
      });

      if (response.ok) {
        await fetchDrivingRecords();
        setNewDrivingRecord({
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          driver: '',
          startLocation: '',
          endLocation: '',
          distance: '',
          duration: '',
          behaviors: [],
        });
      }
    } catch (error) {
      console.error('[Trip Driving] Error adding driving record:', error);
    }
  };

  const saveEditedDriving = async () => {
    if (!currentDrivingRecord || !editingRecord) return;

    const updatedRecords = currentDrivingRecord.records.map(record => {
      if (record.id === editingRecord.id) {
        return {
          ...editingRecord,
          updatedAt: new Date().toISOString(),
        };
      }
      return record;
    });

    try {
      const response = await fetch('/api/trip-driving', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDrivingRecord.id,
          records: updatedRecords,
        }),
      });

      if (response.ok) {
        await fetchDrivingRecords();
        setShowEditDriving(false);
        setEditingRecord(null);
      }
    } catch (error) {
      console.error('[Trip Driving] Error saving edited driving record:', error);
    }
  };

  const deleteDrivingRecord = async () => {
    if (!currentDrivingRecord || !deletingRecordId) return;

    const updatedRecords = currentDrivingRecord.records.filter(
      record => record.id !== deletingRecordId
    );

    try {
      const response = await fetch('/api/trip-driving', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDrivingRecord.id,
          records: updatedRecords,
        }),
      });

      if (response.ok) {
        await fetchDrivingRecords();
        setShowDeleteConfirm(false);
        setDeletingRecordId(null);
      }
    } catch (error) {
      console.error('[Trip Driving] Error deleting driving record:', error);
    }
  };

  const calculateDriverStatistics = (): DriverStatistics[] => {
    if (tripDrivingRecords.length === 0) return [];

    const statsMap = new Map<string, DriverStatistics>();

    // 聚合所有旅行的驾驶记录
    tripDrivingRecords.forEach(tripRecord => {
      tripRecord.records.forEach(record => {
        if (!statsMap.has(record.driver)) {
          statsMap.set(record.driver, {
            driver: record.driver,
            totalScore: 0,
            totalDistance: 0,
            totalDuration: 0,
            totalTrips: 0,
            behaviorCounts: {
              normal: 0,
              speeding: 0,
              harsh_brake: 0,
              rapid_accelerate: 0,
              fatigue: 0,
              phone_use: 0,
              lane_violation: 0,
              red_light: 0,
              safe_driving: 0,
            },
          });
        }

        const stats = statsMap.get(record.driver)!;
        stats.totalScore += record.score;
        stats.totalDistance += record.distance || 0;
        stats.totalDuration += record.duration || 0;
        stats.totalTrips += 1;

        record.behaviors.forEach(behavior => {
          if (stats.behaviorCounts[behavior.type] !== undefined) {
            stats.behaviorCounts[behavior.type] += 1;
          }
        });
      });
    });

    return Array.from(statsMap.values());
  };

  const driverStats = calculateDriverStatistics();

  const calculateFilteredDriverStatistics = (): DriverStatistics[] => {
    if (!analysisDriverFilter) {
      return driverStats;
    }

    return driverStats.filter(stat => stat.driver === analysisDriverFilter);
  };

  const filteredStats = calculateFilteredDriverStatistics();

  const sortedDrivingRecords = currentDrivingRecord ? 
    [...currentDrivingRecord.records].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.time) return 1;
      if (b.time) return -1;
      return 0;
    }) : [];

  const getTravelers = () => {
    const wish = confirmedWishes.find(w => String(w.id) === selectedWishId);
    return wish?.travelers?.split(',').map(t => t.trim()).filter(t => t) || [];
  };

  const getTravelDays = () => {
    const plan = tripPlans?.find(p => String(p.wishId) === String(selectedWishId));
    if (plan) return plan.travelDays;
    return 3;
  };

  const handleBehaviorToggle = (behavior: DrivingBehavior) => {
    setNewDrivingRecord(prev => ({
      ...prev,
      behaviors: prev.behaviors.includes(behavior)
        ? prev.behaviors.filter(b => b !== behavior)
        : [...prev.behaviors, behavior]
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
              const hasRecord = tripDrivingRecords.some(record => record.wishId === String(wish.id));
              return (
                <div
                  key={wish.id}
                  className="bg-black/40 border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors"
                  onClick={() => {
                    setSelectedWishId(String(wish.id));
                    setActiveTab('entry');
                    setShowWishSelector(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[#FFFFFF] font-medium text-xs truncate">{wish.destination}</h4>
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-[#CEA472] truncate">
            {currentWish?.destination} 旅行驾驶
          </h2>
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
            驾驶录入
          </TabsTrigger>
          <TabsTrigger 
            value="query"
            className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300 h-full flex items-center justify-center text-xs"
          >
            驾驶查询
          </TabsTrigger>
          <TabsTrigger 
            value="analysis"
            className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300 h-full flex items-center justify-center text-xs"
          >
            驾驶分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <Car className="w-5 h-5 text-[#CEA472]" />
                <span className="text-[#CEA472] font-medium text-xs">录入驾驶记录</span>
              </div>

              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">驾驶员</Label>
                {travelers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewDrivingRecord({ ...newDrivingRecord, driver: traveler })}
                        className={`px-4 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[80px] ${
                          newDrivingRecord.driver === traveler
                            ? 'bg-[#CEA472] text-[#0a0a0f]'
                            : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={newDrivingRecord.driver}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, driver: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                    placeholder="输入驾驶员姓名"
                  />
                )}
              </div>

              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">行程信息</Label>
                
                {/* 从旅行规划中选择自驾交通 */}
                {selfDrivingRoutes.length > 0 && (
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">从旅行规划选择自驾行程</Label>
                    <Select
                      value={selectedRouteId || ''}
                      onValueChange={(value) => {
                        setSelectedRouteId(value);
                        if (value) {
                          const route = selfDrivingRoutes.find(r => r.id === value);
                          if (route) {
                            setNewDrivingRecord({
                              ...newDrivingRecord,
                              startLocation: route.from,
                              endLocation: route.to,
                            });
                          }
                        } else {
                          setNewDrivingRecord({
                            ...newDrivingRecord,
                            startLocation: '',
                            endLocation: '',
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full">
                        <SelectValue placeholder="选择自驾行程" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                        {selfDrivingRoutes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.day} - {route.from} → {route.to}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">出发地点</Label>
                      <Input
                        value={newDrivingRecord.startLocation}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, startLocation: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                        placeholder="输入出发地点"
                      />
                    </div>
                    <div>
                      <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">目的地点</Label>
                      <Input
                        value={newDrivingRecord.endLocation}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, endLocation: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                        placeholder="输入目的地点"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">行驶里程（公里）</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={newDrivingRecord.distance}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, distance: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">行驶时长（分钟）</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={newDrivingRecord.duration}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, duration: e.target.value })}
                        className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">日期</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="YYYY-MM-DD"
                    value={newDrivingRecord.date}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, date: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                  />
                </div>
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">时间</Label>
                  <Input
                    type="time"
                    value={newDrivingRecord.time}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, time: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">驾驶行为评分</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(drivingBehaviors).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleBehaviorToggle(key as DrivingBehavior)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-xs ${
                        newDrivingRecord.behaviors.includes(key as DrivingBehavior)
                          ? 'border-[#CEA472] bg-[#CEA472]/10 text-[#CEA472]'
                          : 'border-[#CEA472]/20 bg-black/40 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                      }`}
                    >
                      <span className={config.color}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{config.label}</div>
                        <div className={`text-xs ${config.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {config.score > 0 ? '+' : ''}{config.score}分
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {(() => {
                    const score = calculateScore(
                      newDrivingRecord.behaviors,
                      newDrivingRecord.distance ? parseFloat(newDrivingRecord.distance) : undefined,
                      newDrivingRecord.duration ? parseFloat(newDrivingRecord.duration) : undefined
                    );
                    return score !== 0 ? (
                      <div className="mt-3 p-3 bg-black/40 rounded-lg border border-[#CEA472]/20">
                        <div className="text-xs text-[#FFFFFF]/60 mb-2">本次积分：</div>
                        <div className={`text-lg font-semibold ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {score >= 0 ? '+' : ''}{score} 分
                        </div>
                      </div>
                    ) : null;
                  })()}
              </div>
            </div>
          </div>
          <div className="mt-4 px-2.5 sm:px-0">
            <Button
              onClick={addDrivingRecord}
              disabled={!newDrivingRecord.driver || !newDrivingRecord.startLocation || !newDrivingRecord.endLocation}
              className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 min-h-[48px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              保存驾驶记录
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="query" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
            {currentDrivingRecord && sortedDrivingRecords.length > 0 ? (
              <div className="space-y-3 sm:space-y-3">
                {sortedDrivingRecords.map(record => (
                  <div
                    key={record.id}
                    className="p-3.5 sm:p-4 rounded-lg bg-black/40 border border-[#CEA472]/20 hover:bg-black/70 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="text-xl sm:text-2xl text-[#CEA472] flex-shrink-0 pt-0.5">
                        <Car className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4">
                          <div className="sm:col-span-8">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[#CEA472] font-medium text-xs whitespace-nowrap">{record.driver}</span>
                              <span className="text-[#FFFFFF]/60 text-xs whitespace-nowrap">{record.date} {record.time || ''}</span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#FFFFFF]/40" />
                              <span className="text-[#FFFFFF] text-xs">{record.startLocation}</span>
                              <span className="text-[#FFFFFF]/40 text-xs mx-1">→</span>
                              <span className="text-[#FFFFFF] text-xs">{record.endLocation}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-[#FFFFFF]/60">
                              {record.distance && (
                                <span className="flex items-center gap-1">
                                  <Route className="w-3 h-3" />
                                  {record.distance}公里
                                </span>
                              )}
                              {record.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {record.duration}分钟
                                </span>
                              )}
                            </div>
                            {record.behaviors.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {record.behaviors.map((behavior, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-0.5 rounded-full text-xs ${drivingBehaviors[behavior.type]?.color || 'text-gray-400'} bg-black/40`}
                                  >
                                    {drivingBehaviors[behavior.type]?.label || behavior.type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="sm:col-span-4 text-left sm:text-right">
                            <div className="text-xs text-[#FFFFFF]/60 mb-1">本次积分</div>
                            <div className={`text-lg font-semibold ${record.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {record.score >= 0 ? '+' : ''}{record.score}
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
                            setEditingRecord(record);
                            setShowEditDriving(true);
                          }}
                          className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingRecordId(record.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-500 hover:text-red-500 hover:bg-transparent"
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
                <Car className="w-12 h-12 text-[#CEA472]/40 mx-auto mb-4" />
                <p className="text-[#FFFFFF]/60 text-xs">暂无驾驶记录</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <div className="bg-black/40 backdrop-blur-md border border-[#CEA472]/20 rounded-lg p-3.5 sm:p-6">
            <div className="space-y-5 sm:space-y-6">
              <div>
                <div className="text-xs text-[#FFFFFF]/40 mb-2">筛选驾驶员：</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setAnalysisDriverFilter(null)}
                    className={`px-3 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[60px] ${
                      analysisDriverFilter === null
                        ? 'bg-[#CEA472] text-[#0a0a0f]'
                        : 'bg-black/40 border border-[#CEA472]/20 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                    }`}
                  >
                    全部
                  </button>
                  {travelers.map((traveler) => (
                    <button
                      key={traveler}
                      onClick={() => setAnalysisDriverFilter(traveler)}
                      className={`px-3 py-2 rounded-full text-xs transition-all min-h-[44px] min-w-[60px] ${
                        analysisDriverFilter === traveler
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
                <h4 className="text-[#FFFFFF] font-medium mb-3 text-xs">驾驶员统计</h4>
                <div className="space-y-3">
                  {filteredStats.map(stat => (
                    <div key={stat.driver} className="p-4 bg-black/40 rounded-lg border border-[#CEA472]/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#CEA472] font-medium text-sm">{stat.driver}</span>
                        <div className={`text-lg font-bold ${stat.totalScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.totalScore >= 0 ? '+' : ''}{stat.totalScore} 分
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="text-center p-2 bg-black/40 rounded">
                          <div className="text-[#FFFFFF]/60">行驶次数</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalTrips}</div>
                        </div>
                        <div className="text-center p-2 bg-black/40 rounded">
                          <div className="text-[#FFFFFF]/60">总里程</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalDistance.toFixed(1)} km</div>
                        </div>
                        <div className="text-center p-2 bg-black/40 rounded">
                          <div className="text-[#FFFFFF]/60">总时长</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalDuration} min</div>
                        </div>
                        <div className="text-center p-2 bg-black/40 rounded">
                          <div className="text-[#FFFFFF]/60">平均积分</div>
                          <div className={`font-medium mt-1 ${stat.totalTrips > 0 ? (stat.totalScore / stat.totalTrips >= 0 ? 'text-green-400' : 'text-red-400') : 'text-[#FFFFFF]'}`}>
                            {stat.totalTrips > 0 ? (stat.totalScore / stat.totalTrips >= 0 ? '+' : '') + (stat.totalScore / stat.totalTrips).toFixed(1) : '0'}
                          </div>
                        </div>
                      </div>
                      {Object.entries(stat.behaviorCounts).filter(([_, count]) => count > 0).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#CEA472]/20">
                          <div className="text-xs text-[#FFFFFF]/60 mb-2">驾驶行为统计</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(stat.behaviorCounts)
                              .filter(([_, count]) => count > 0)
                              .map(([behavior, count]) => (
                                <span
                                  key={behavior}
                                  className={`px-2 py-1 rounded text-xs ${drivingBehaviors[behavior]?.color || 'text-gray-400'} bg-black/40`}
                                >
                                  {drivingBehaviors[behavior]?.label || behavior} × {count}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {filteredStats.length === 0 && (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-[#CEA472]/40 mx-auto mb-4" />
                  <p className="text-[#FFFFFF]/60 text-xs">暂无统计数据</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDriving} onOpenChange={setShowEditDriving}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑驾驶记录</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto flex-1">
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">驾驶员</Label>
                <Select
                  value={editingRecord.driver}
                  onValueChange={(value) => setEditingRecord({ ...editingRecord, driver: value })}
                >
                  <SelectTrigger className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
                    {travelers.map((traveler, idx) => (
                      <SelectItem key={idx} value={traveler}>
                        {traveler}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">日期</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="YYYY-MM-DD"
                    value={editingRecord.date}
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                  />
                </div>
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">时间</Label>
                  <Input
                    type="time"
                    value={editingRecord.time || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, time: e.target.value })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">出发地点</Label>
                <Input
                  value={editingRecord.startLocation}
                  onChange={(e) => setEditingRecord({ ...editingRecord, startLocation: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                  placeholder="输入出发地点"
                />
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">目的地点</Label>
                <Input
                  value={editingRecord.endLocation}
                  onChange={(e) => setEditingRecord({ ...editingRecord, endLocation: e.target.value })}
                  className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                  placeholder="输入目的地点"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">行驶里程（公里）</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editingRecord.distance || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, distance: parseFloat(e.target.value) || 0 })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">行驶时长（分钟）</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editingRecord.duration || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, duration: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] text-xs h-10"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#FFFFFF]/60 mb-2 block text-xs">驾驶行为评分</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(drivingBehaviors).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const newBehaviors = editingRecord.behaviors.some(b => b.type === key)
                          ? editingRecord.behaviors.filter(b => b.type !== key)
                          : [...editingRecord.behaviors, { type: key as DrivingBehavior }];
                        setEditingRecord({ 
                          ...editingRecord, 
                          behaviors: newBehaviors,
                          score: calculateScore(newBehaviors.map(b => b.type))
                        });
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-xs ${
                        editingRecord.behaviors.some(b => b.type === key)
                          ? 'border-[#CEA472] bg-[#CEA472]/10 text-[#CEA472]'
                          : 'border-[#CEA472]/20 bg-black/40 text-[#FFFFFF]/60 hover:border-[#CEA472]/40'
                      }`}
                    >
                      <span className={config.color}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{config.label}</div>
                        <div className={`text-xs ${config.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {config.score > 0 ? '+' : ''}{config.score}分
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-black/40 rounded-lg border border-[#CEA472]/20">
                  <div className="text-xs text-[#FFFFFF]/60 mb-2">本次积分：</div>
                  <div className={`text-lg font-semibold ${editingRecord.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {editingRecord.score >= 0 ? '+' : ''}{editingRecord.score} 分
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 bg-[#0a0a0f] pt-4 border-t border-[#CEA472]/20">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDriving(false);
                setEditingRecord(null);
              }}
              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={saveEditedDriving}
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
            <DialogTitle className="text-[#FFFFFF]">删除驾驶记录</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">
              确定要删除这条驾驶记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingRecordId(null);
              }}
              className="bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={deleteDrivingRecord}
              className="bg-red-500 text-white hover:bg-red-500/80"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWishSelector} onOpenChange={setShowWishSelector}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">选择旅行</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto flex-1">
            {confirmedWishes.map(wish => {
              const existingRecord = tripDrivingRecords.find(record => record.wishId === String(wish.id));
              return (
                <div key={wish.id}>
                  <button
                    onClick={() => {
                      setSelectedWishId(String(wish.id));
                      setActiveTab('entry');
                      setShowWishSelector(false);
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
                        </div>
                        <div className="text-xs text-[#FFFFFF]/60 mt-1">
                          {wish.confirmed_date ? `${wish.confirmed_date} · ` : ''}{wish.travelers}
                        </div>
                        {!existingRecord && (
                          <div className="text-xs text-[#CEA472]/80 mt-1">点击创建驾驶记录</div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          <DialogFooter className="sticky bottom-0 bg-[#0a0a0f] pt-4 border-t border-[#CEA472]/20">
            <Button
              variant="outline"
              onClick={() => setShowWishSelector(false)}
              className="w-full bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
