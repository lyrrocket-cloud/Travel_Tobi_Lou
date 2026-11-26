'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Car, Navigation, Clock, TrendingUp, Award, MapPin, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTabTransition, TabSwitchSkeleton } from '@/components/motion/TabTransition';
import { Wish, TripDrivingRecord, DrivingRecordItem, DrivingBehavior, DriverStatistics } from '@/types';
import { TripPlan } from '@/types';

// 驾驶行为配置
const drivingBehaviors: Record<string, { icon: React.ReactNode; label: string; score: number; color: string }> = {
  normal: { icon: <Car className="w-4 h-4" />, label: '正常驾驶', score: 0, color: 'text-green-400' },
  speeding: { icon: <TrendingUp className="w-4 h-4" />, label: '超速', score: -10, color: 'text-red-500' },
  lane_violation: { icon: <Navigation className="w-4 h-4" />, label: '变道违规', score: -5, color: 'text-orange-400' },
  red_light: { icon: <Car className="w-4 h-4" />, label: '闯红灯', score: -20, color: 'text-red-700' },
};

interface TripDrivingProps {
  confirmedWishes: Wish[];
  isAdminMode?: boolean;
  // 受控的子标签（entry/query/analysis），由页面级 URL 状态统一管理
  subTab?: string;
  onSubTabChange?: (tab: string) => void;
}

const VALID_DRIVE_SUB = ['entry', 'query', 'analysis', 'lottery'];

export default function TripDriving({ confirmedWishes, isAdminMode = false, subTab, onSubTabChange }: TripDrivingProps) {
  const [tripDrivingRecords, setTripDrivingRecords] = useState<TripDrivingRecord[]>([]);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [showWishSelector, setShowWishSelector] = useState(false);
  // 受控的子标签：父组件（URL 状态）为单一事实来源；内部镜像避免被默认值覆盖
  const [internalTab, setInternalTab] = useState<string>(
    subTab && VALID_DRIVE_SUB.includes(subTab) ? subTab : 'entry'
  );
  const activeTab = internalTab;
  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    onSubTabChange?.(tab);
  };
  // 标记首次 selected-wish-changed（页面挂载还原），避免其把子标签重置为 entry 而覆盖 URL 还原
  const isInitialWishRestore = useRef(true);
  // 记录上一次收到的行程 id，过滤掉自身 selectedWishId 变化回显派发的同名事件，避免误重置子标签
  const prevWishIdRef = useRef<string | null>(null);
  const tabTransition = useTabTransition();
  const [showAddDriving, setShowAddDriving] = useState(false);
  const [showEditDriving, setShowEditDriving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DrivingRecordItem | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [lotteryMode, setLotteryMode] = useState<'fair' | 'random'>('fair');
  // 记录范围筛选：全部历史 / 本次旅行（查询与总览共用）
  const [recordScope, setRecordScope] = useState<'all' | 'current'>('all');
  const [lotteryResult, setLotteryResult] = useState<string | null>(null);
  const [isLotteryRunning, setIsLotteryRunning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [initializedFromStorage, setInitializedFromStorage] = useState(false);

  // 总览模式 ID
  const OVERVIEW_WISH_ID = '__overview__';

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

  // 判断当前行程是否冻结（冻结的行程不可修改）
  const isCurrentTripFrozen = !!currentTripPlan?.frozen;

  // 从旅行规划中提取所有自驾交通路线（包括到达、离开、活动间交通）
  const selfDrivingRoutes = currentTripPlan?.days?.flatMap(day => {
    return day.transport
      ?.filter(t => t.type === 'car' || t.type === '自驾')
      .map(t => {
        // 根据 position 类型生成不同的描述
        let description = '';
        if (t.position === 'arrival') {
          description = '到达交通';
        } else if (t.position === 'departure') {
          description = '离开交通';
        } else if (t.position === 'between') {
          description = '活动间交通';
        }
        
        return {
          id: t.id,
          day: `Day${day.dayNumber}`,
          from: t.from,
          to: t.to,
          description: description,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
        };
      }) || [];
  }) || [];

  useEffect(() => {
    // 读取保存的选中愿望ID（与 TripPlanner/TripAccounting 共享，保留上一次的行程）
    const savedWishId = localStorage.getItem('travel-toolbox-selected-wish-id');
    
    // 如果有保存的愿望ID，使用它（包括刷新页面）
    // 但是如果是总览模式ID，则不恢复
    if (savedWishId && savedWishId !== OVERVIEW_WISH_ID) {
      setSelectedWishId(savedWishId);
    }
    setInitializedFromStorage(true);
  }, []);

  // 保存选中的旅行到 localStorage（与 TripPlanner/TripAccounting 共享），并同步页面级头部
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedWishId && initializedFromStorage && selectedWishId !== OVERVIEW_WISH_ID) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedWishId);
      window.dispatchEvent(new CustomEvent('selected-wish-changed', { detail: { wishId: selectedWishId } }));
    }
  }, [selectedWishId, initializedFromStorage]);

  // 外部（URL 还原）子标签切换时同步到内部
  useEffect(() => {
    if (subTab && VALID_DRIVE_SUB.includes(subTab) && subTab !== internalTab) {
      setInternalTab(subTab);
    }
  }, [subTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听外部（页面级切换旅行）的行程变化
  useEffect(() => {
    const handleSelectedWishChanged = (e: Event) => {
      const wishId = (e as CustomEvent).detail?.wishId;
      if (!wishId || wishId === OVERVIEW_WISH_ID) return;
      const id = String(wishId);
      // 过滤自身 selectedWishId 变化后回显派发的同 id 事件，避免误重置子标签
      const isSameAsPrev = prevWishIdRef.current === id;
      prevWishIdRef.current = id;
      setSelectedWishId(id);
      setLotteryResult(null);
      setShowWishSelector(false);
      // 首次挂载还原不重置；回显同 id 不重置；仅真正切换行程时回到 entry
      if (!isInitialWishRestore.current && !isSameAsPrev) {
        setActiveTab('entry');
      }
      isInitialWishRestore.current = false;
    };
    window.addEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    return () => {
      window.removeEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    
    // 如果是总览模式，不执行自动选择逻辑
    if (selectedWishId === OVERVIEW_WISH_ID) {
      return;
    }
    
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
    if (!editingRecord) return;

    const targetRecord = isOverviewMode 
      ? tripDrivingRecords.find(r => String(r.wishId) === String(editingRecord.wishId))
      : currentDrivingRecord;

    if (!targetRecord) return;

    const updatedRecords = targetRecord.records.map(record => {
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
          id: targetRecord.id,
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
    if (!deletingRecordId) return;

    const targetRecord = isOverviewMode
      ? tripDrivingRecords.find(r => 
          r.records.some(record => record.id === deletingRecordId)
        )
      : currentDrivingRecord;

    if (!targetRecord) return;

    const updatedRecords = targetRecord.records.filter(
      record => record.id !== deletingRecordId
    );

    try {
      const response = await fetch('/api/trip-driving', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetRecord.id,
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

    const recordsToProcess = recordScope === 'current' && selectedWishId !== OVERVIEW_WISH_ID
      ? tripDrivingRecords.filter(tripRecord => String(tripRecord.wishId) === String(selectedWishId))
      : tripDrivingRecords;

    recordsToProcess.forEach(tripRecord => {
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

    return Array.from(statsMap.values()).sort((a, b) => b.totalScore - a.totalScore);
  };

  const driverStats = calculateDriverStatistics();

  const getTravelers = () => {
    const wish = confirmedWishes.find(w => String(w.id) === selectedWishId);
    return wish?.travelers?.split(',').map(t => t.trim()).filter(t => t) || [];
  };

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
              const hasRecord = tripDrivingRecords.some(record => record.wishId === String(wish.id));
              return (
                <div
                  key={wish.id}
                  className="bg-black/40 backdrop-blur-sm rounded-none border-0 p-3.5 sm:p-4 cursor-pointer hover:bg-black/60 transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  onClick={() => {
                    setSelectedWishId(String(wish.id));
                    setActiveTab('entry');
                    setShowWishSelector(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[#FFFFFF] font-medium text-xs truncate">{wish.destination}</h3>
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

  const isOverviewMode = selectedWishId === OVERVIEW_WISH_ID;

  const currentWish = confirmedWishes.find(wish => String(wish.id) === selectedWishId);
  const travelers = getTravelers();

  // 按目的地查找（「驾驶分析」记录列表使用）
  const getDestinationByWishId = (wishId: string): string => {
    const wish = confirmedWishes.find(w => String(w.id) === String(wishId));
    return wish?.destination || '未知';
  };

  // 全部旅行的驾驶记录（用于「驾驶分析」总览统计）
  const allDrivingRecords = tripDrivingRecords.flatMap(tripRecord => 
      (tripRecord.records || []).map(record => ({
        ...record,
        wishId: tripRecord.wishId,
        destination: getDestinationByWishId(tripRecord.wishId),
      }))
    ).sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return 1;
      if (b.time) return -1;
      return 0;
    });

  // 按筛选范围取记录（查询与总览共用）
  const scopedDrivingRecords = recordScope === 'current' && selectedWishId !== OVERVIEW_WISH_ID
    ? allDrivingRecords.filter(record => String(record.wishId) === String(selectedWishId))
    : allDrivingRecords;

  // 范围筛选：全部 / 本次旅行
  const scopeFilter = (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => setRecordScope('all')}
        className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          recordScope === 'all' ? 'text-[#CEA472]' : 'text-white/80 hover:text-[#CEA472]'
        }`}
      >
        全部
      </button>
      <span aria-hidden="true" className="h-4 w-px self-center bg-[#CEA472]/40" />
      <button
        onClick={() => setRecordScope('current')}
        className={`px-2.5 py-1 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          recordScope === 'current' ? 'text-[#CEA472]' : 'text-white/80 hover:text-[#CEA472]'
        }`}
      >
        本次旅行
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => tabTransition.switchTo(v, () => setActiveTab(v))} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1 h-[48px] sm:h-[44px] bg-black/30 backdrop-blur-md rounded-none p-0">
          <TabsTrigger 
            value="entry"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            驾驶录入
          </TabsTrigger>
          <TabsTrigger 
            value="query"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            驾驶查询
          </TabsTrigger>
          <TabsTrigger 
            value="analysis"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            驾驶总览
          </TabsTrigger>
          <TabsTrigger 
            value="lottery"
            className="animate-chip-in data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] h-full flex items-center justify-center text-xs"
          >
            驾驶抽签
          </TabsTrigger>
        </TabsList>
        <div className={`relative ${showWishSelector || activeTab === 'lottery' ? 'hidden' : ''}`}>
          <div className={tabTransition.contentClassName} style={{ opacity: tabTransition.contentOpacity }}>

        <TabsContent value="entry" className="mt-3">
            {isCurrentTripFrozen && (
              <div className="mb-4 p-3 bg-blue-500/10   rounded-none flex items-center gap-2">
                <span className="text-blue-400 text-xs">此行程已冻结，无法添加或修改驾驶记录</span>
              </div>
            )}
            <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
            <div className="space-y-4 sm:space-y-5">
              <div>
                <Label htmlFor="drive-driver" className="text-[#CEA472] mb-2 block text-xs">驾驶员</Label>
                {travelers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {travelers.map((traveler, idx) => (
                      <button
                        key={idx}
                        disabled={isCurrentTripFrozen}
                        aria-pressed={newDrivingRecord.driver === traveler}
                        onClick={() => setNewDrivingRecord({ ...newDrivingRecord, driver: traveler })}
                        className={`px-4 py-2 rounded-none text-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[80px] ${
                          newDrivingRecord.driver === traveler
                            ? 'text-[#CEA472]'
                            : 'text-white/80 hover:text-[#CEA472]'
                        }`}
                      >
                        {traveler}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    id="drive-driver"
                    value={newDrivingRecord.driver}
                    readOnly={isCurrentTripFrozen}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, driver: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                    placeholder="输入驾驶员姓名"
                  />
                )}
              </div>

              <div>
                <Label className="text-[#CEA472] mb-2 block text-xs">行程信息</Label>
                
                {/* 从旅行规划中选择自驾交通 */}
                {selfDrivingRoutes.length > 0 && (
                  <div className="mb-3">
                    <Label className="text-[#FFFFFF]/40 mb-1.5 block text-xs">从旅行规划选择自驾行程</Label>
                    <Select
                      value={selectedRouteId || ''}
                      disabled={isCurrentTripFrozen}
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
                      <SelectTrigger aria-label="选择自驾行程" className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full">
                        <SelectValue placeholder="选择自驾行程" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f]  ">
                        {selfDrivingRoutes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.day} {route.description} - {route.from} → {route.to}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <Label htmlFor="drive-start" className="text-[#FFFFFF]/40 mb-1.5 block text-xs">出发地点</Label>
                      <Input
                        id="drive-start"
                        value={newDrivingRecord.startLocation}
                        readOnly={isCurrentTripFrozen}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, startLocation: e.target.value })}
                        className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                        placeholder="输入出发地点"
                      />
                    </div>
                    <div>
                      <Label htmlFor="drive-end" className="text-[#FFFFFF]/40 mb-1.5 block text-xs">目的地点</Label>
                      <Input
                        id="drive-end"
                        value={newDrivingRecord.endLocation}
                        readOnly={isCurrentTripFrozen}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, endLocation: e.target.value })}
                        className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                        placeholder="输入目的地点"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <Label htmlFor="drive-distance" className="text-[#FFFFFF]/40 mb-1.5 block text-xs">行驶里程（公里）</Label>
                      <Input
                        id="drive-distance"
                        type="number"
                        min="0"
                        step="0.1"
                        value={newDrivingRecord.distance}
                        readOnly={isCurrentTripFrozen}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, distance: e.target.value })}
                        className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="drive-duration" className="text-[#FFFFFF]/40 mb-1.5 block text-xs">行驶时长（分钟）</Label>
                      <Input
                        id="drive-duration"
                        type="number"
                        min="0"
                        step="1"
                        value={newDrivingRecord.duration}
                        readOnly={isCurrentTripFrozen}
                        onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, duration: e.target.value })}
                        className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <Label htmlFor="drive-date" className="text-[#CEA472] mb-2 block text-xs">日期</Label>
                  <Input
                    id="drive-date"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="YYYY-MM-DD"
                    value={newDrivingRecord.date}
                    readOnly={isCurrentTripFrozen}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, date: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="drive-time" className="text-[#CEA472] mb-2 block text-xs">时间</Label>
                  <Input
                    id="drive-time"
                    type="time"
                    value={newDrivingRecord.time}
                    readOnly={isCurrentTripFrozen}
                    onChange={(e) => setNewDrivingRecord({ ...newDrivingRecord, time: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              </div>

            </div>
          </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={addDrivingRecord}
                disabled={isCurrentTripFrozen || !newDrivingRecord.driver || !newDrivingRecord.startLocation || !newDrivingRecord.endLocation}
                className="w-44 bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 min-h-[48px]"
              >
                保存驾驶记录
              </Button>
            </div>
          </TabsContent>

        <TabsContent value="query" className="mt-3">
          <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
            {scopeFilter}
            {scopedDrivingRecords.length > 0 ? (
              <div className="space-y-3 sm:space-y-3">
                {scopedDrivingRecords.map(record => (
                  <div
                    key={record.id}
                    className="p-3.5 sm:p-4 rounded-none border-0 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
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
                              {record.destination && (
                                <span className="text-[#CEA472]/70 text-xs whitespace-nowrap">· {record.destination}</span>
                              )}
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
                    {isAdminMode && !isCurrentTripFrozen && String(record.wishId) === String(selectedWishId) && (
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

        <TabsContent value="analysis" className="mt-3">
          <div className="bg-black/60 backdrop-blur-md   rounded-none p-3.5 sm:p-6">
            {scopeFilter}
            <div className="space-y-5 sm:space-y-6">
              <div>
                <div className="space-y-3">
                  {driverStats.map(stat => (
                    <div key={stat.driver} className="p-4 bg-black/60 rounded-none  ">
                      <div className="text-[#CEA472] font-medium text-sm mb-3">{stat.driver}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="text-center p-2 bg-black/60 rounded-none">
                          <div className="text-[#FFFFFF]/60">总次数</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalTrips}</div>
                        </div>
                        <div className="text-center p-2 bg-black/60 rounded-none">
                          <div className="text-[#FFFFFF]/60">总里程</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalDistance.toFixed(1)} km</div>
                        </div>
                        <div className="text-center p-2 bg-black/60 rounded-none">
                          <div className="text-[#FFFFFF]/60">总时长</div>
                          <div className="text-[#FFFFFF] font-medium mt-1">{stat.totalDuration} min</div>
                        </div>
                        <div className="text-center p-2 bg-black/60 rounded-none">
                          <div className="text-[#FFFFFF]/60">总积分</div>
                          <div className="font-medium mt-1 text-[#FFFFFF]">
                            {stat.totalScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {driverStats.length === 0 && (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-[#CEA472]/40 mx-auto mb-4" />
                  <p className="text-[#FFFFFF]/60 text-xs">暂无统计数据</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
          </div>
          {tabTransition.isLoading && <TabSwitchSkeleton />}
        </div>
      </Tabs>

      {/* 驾驶抽签标签内容 */}
      {activeTab === 'lottery' && (
        <div className="mt-3 tab-section-in space-y-3">
          <div className="p-4 bg-black/60 backdrop-blur-md   rounded-none">
            <div className="flex gap-2">
              <button
                onClick={() => setLotteryMode('fair')}
                className={`flex-1 p-3 rounded-none text-center transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  lotteryMode === 'fair'
                    ? 'text-[#CEA472]'
                    : 'text-white/80 hover:text-[#CEA472]'
                }`}
              >
                <div className="font-medium text-sm">公平模式</div>
                <div className="text-xs text-[#FFFFFF]/60 mt-0.5">选择积分最低的人驾驶</div>
              </button>
              <button
                onClick={() => setLotteryMode('random')}
                className={`flex-1 p-3 rounded-none text-center transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  lotteryMode === 'random'
                    ? 'text-[#CEA472]'
                    : 'text-white/80 hover:text-[#CEA472]'
                }`}
              >
                <div className="font-medium text-sm">随机模式</div>
                <div className="text-xs text-[#FFFFFF]/60 mt-0.5">随机选择一个同行人</div>
              </button>
            </div>
          </div>

          {lotteryResult && !isLotteryRunning && (
            <div className="text-center py-3">
              <div className="text-xs text-[#FFFFFF]/60 mb-1">抽签结果</div>
              <div className="text-2xl font-bold text-[#CEA472]">{lotteryResult}</div>
            </div>
          )}

          <div className="flex justify-center">
          <Button
            onClick={() => {
              const travelersStr = currentWish?.travelers || '';
              const travelersList = travelersStr.split(/[、,，;；]/).map(t => t.trim()).filter(t => t);
              if (travelersList.length === 0) return;
              setIsLotteryRunning(true);
              setLotteryResult(null);
              let count = 0;
              const maxCount = 20;
              const interval = setInterval(() => {
                count++;
                if (count >= maxCount) {
                  clearInterval(interval);
                  if (lotteryMode === 'fair') {
                    const driverScores = travelersList.map(name => {
                      // 累计积分：统计该同行人所有历史行程的积分总和
                      const totalScore = allDrivingRecords
                        .filter(r => r.driver === name)
                        .reduce((sum, r) => sum + (r.score || 0), 0);
                      return { name, score: totalScore };
                    });
                    const lowest = driverScores.reduce((min, curr) => curr.score < min.score ? curr : min, driverScores[0]);
                    setLotteryResult(lowest.name);
                  } else {
                    const randomIndex = Math.floor(Math.random() * travelersList.length);
                    setLotteryResult(travelersList[randomIndex]);
                  }
                  setIsLotteryRunning(false);
                } else {
                  const randomIndex = Math.floor(Math.random() * travelersList.length);
                  setLotteryResult(travelersList[randomIndex]);
                }
              }, 100);
            }}
            disabled={isLotteryRunning || !currentWish?.travelers}
            className="w-44 h-11 bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-50 text-xs"
          >
            {isLotteryRunning ? '抽签中...' : '开始抽签'}
          </Button>
          </div>
        </div>
      )}

      <Dialog open={showEditDriving} onOpenChange={setShowEditDriving}>
        <DialogContent className="bg-[#0a0a0f]   max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑驾驶记录</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto flex-1">
              <div>
                <Label className="text-[#CEA472] mb-2 block text-xs">驾驶员</Label>
                <Select
                  value={editingRecord.driver}
                  onValueChange={(value) => setEditingRecord({ ...editingRecord, driver: value })}
                >
                  <SelectTrigger className="bg-black/60   text-[#FFFFFF] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f]  ">
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
                  <Label className="text-[#CEA472] mb-2 block text-xs">日期</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="YYYY-MM-DD"
                    value={editingRecord.date}
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                  />
                </div>
                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">时间</Label>
                  <Input
                    type="time"
                    value={editingRecord.time || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, time: e.target.value })}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full"
                  />
                </div>
              </div>
              {selfDrivingRoutes.length > 0 && (
                <div>
                  <Label className="text-[#FFFFFF]/40 mb-2 block text-xs">从旅行规划选择自驾行程</Label>
                  <Select
                    value={selfDrivingRoutes.find(r => r.from === editingRecord.startLocation && r.to === editingRecord.endLocation)?.id || ''}
                    onValueChange={(value) => {
                      if (value) {
                        const route = selfDrivingRoutes.find(r => r.id === value);
                        if (route) {
                          setEditingRecord({
                            ...editingRecord,
                            startLocation: route.from,
                            endLocation: route.to,
                          });
                        }
                      } else {
                        setEditingRecord({
                          ...editingRecord,
                          startLocation: '',
                          endLocation: '',
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-black/60   text-[#FFFFFF] text-xs h-10 w-full">
                      <SelectValue placeholder="选择自驾行程" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f]  ">
                      {selfDrivingRoutes.map(route => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.day} {route.description} - {route.from} → {route.to}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-[#CEA472] mb-2 block text-xs">出发地点</Label>
                <Input
                  value={editingRecord.startLocation}
                  onChange={(e) => setEditingRecord({ ...editingRecord, startLocation: e.target.value })}
                  className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                  placeholder="输入出发地点"
                />
              </div>
              <div>
                <Label className="text-[#CEA472] mb-2 block text-xs">目的地点</Label>
                <Input
                  value={editingRecord.endLocation}
                  onChange={(e) => setEditingRecord({ ...editingRecord, endLocation: e.target.value })}
                  className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                  placeholder="输入目的地点"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">行驶里程（公里）</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editingRecord.distance || ''}
                    onChange={(e) => {
                      const newDistance = parseFloat(e.target.value) || 0;
                      setEditingRecord({ 
                        ...editingRecord, 
                        distance: newDistance,
                        score: calculateScore(editingRecord.behaviors.map(b => b.type), newDistance, editingRecord.duration)
                      });
                    }}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label className="text-[#CEA472] mb-2 block text-xs">行驶时长（分钟）</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editingRecord.duration || ''}
                    onChange={(e) => {
                      const newDuration = parseInt(e.target.value) || 0;
                      setEditingRecord({ 
                        ...editingRecord, 
                        duration: newDuration,
                        score: calculateScore(editingRecord.behaviors.map(b => b.type), editingRecord.distance, newDuration)
                      });
                    }}
                    className="bg-black/60   text-[#FFFFFF] text-xs h-10"
                    placeholder="0"
                  />
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
              className="bg-transparent text-white/80 hover:bg-transparent hover:text-[#CEA472]"
            >
              取消
            </Button>
            <Button
              onClick={saveEditedDriving}
              className="bg-transparent text-[#CEA472] hover:bg-transparent hover:text-[#CEA472]/80"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#0a0a0f]  ">
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
              className="bg-black/60   text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

    </div>
  );
}
