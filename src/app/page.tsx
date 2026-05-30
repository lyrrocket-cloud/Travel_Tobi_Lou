'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Heart, MapPin, Calendar, User, Edit2, CheckCircle, Trash2, Droplets, Plane, Receipt, Route, Map, Coins, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const monthsShort = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

interface Wish {
  id: string;
  destination: string;
  travel_month: string;
  travel_year: number;
  wisher_name: string;
  is_confirmed: number;
  is_expired?: number;
  confirmed_date?: string;
  travelers?: string;
  followers_count: number;
  followers: string[];
}

export default function Home() {
  const [destination, setDestination] = useState('');
  const [travelYearMonth, setTravelYearMonth] = useState('');
  const [wisherName, setWisherName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('make-wish');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWish, setEditingWish] = useState<Wish | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmingWishId, setConfirmingWishId] = useState<string>('');
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTravelers, setConfirmTravelers] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingWishId, setDeletingWishId] = useState<string>('');
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Wish | null>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followingWishId, setFollowingWishId] = useState<string>('');
  const [followerName, setFollowerName] = useState('');
  const [deleteFollowerModalOpen, setDeleteFollowerModalOpen] = useState(false);
  const [deletingFollowerWishId, setDeletingFollowerWishId] = useState<string>('');
  const [deleteFollowerName, setDeleteFollowerName] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mainTab, setMainTab] = useState('wish');

  // 加载愿望数据
  const fetchWishes = async () => {
    console.log('[Page] Fetching wishes...');
    setLoading(true);
    try {
      const response = await fetch('/api/wishes');
      const data = await response.json();
      console.log('[Page] Fetch wishes response:', data);
      setWishes(data.wishes || []);
      if (data.usingInMemory) {
        console.log('[Page] Using in-memory storage');
      }
    } catch (error) {
      console.error('[Page] Failed to fetch wishes:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载愿望数据
  useEffect(() => {
    fetchWishes();
  }, []);

  // 当愿望数据加载后，设置选中的年份为最新有数据的年份
  useEffect(() => {
    if (wishes.length > 0) {
      const years = [...new Set(
        wishes
          .filter(w => w.is_confirmed === 1 && w.confirmed_date)
          .map(w => new Date(w.confirmed_date!).getFullYear())
      )].sort((a, b) => b - a);
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }
    }
  }, [wishes]);

  const handleMakeWish = async () => {
    console.log('[Page] Handle make wish called');
    
    if (!destination || !travelYearMonth || !wisherName) {
      alert('请填写所有必填项');
      return;
    }

    // 解析 YYYY-MM 格式
    const dateMatch = travelYearMonth.match(/^(\d{4})-(\d{2})$/);
    if (!dateMatch) {
      alert('请输入正确的日期格式（YYYY-MM），例如：2026-03');
      return;
    }

    const travelYear = parseInt(dateMatch[1]);
    const travelMonthNum = parseInt(dateMatch[2]);
    const travelMonth = months[travelMonthNum - 1];

    console.log('[Page] Making wish with:', { destination, travelYear, travelMonth, wisherName });

    setIsAnimating(true);

    // 模拟抛硬币动画
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wishes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination,
            travelYear,
            travelMonth,
            wisherName,
          }),
        });

        const data = await response.json();
        console.log('[Page] Make wish response:', data);

        if (response.ok) {
          setAnimationComplete(true);
          setTimeout(() => {
            setIsAnimating(false);
            setAnimationComplete(false);
            setDestination('');
            setTravelYearMonth('');
            setWisherName('');
            fetchWishes();
          }, 1500);
        } else {
          alert(`创建愿望失败: ${data.error || '未知错误'}${data.details ? ` (${data.details})` : ''}`);
          setIsAnimating(false);
        }
      } catch (error) {
        console.error('[Page] Error creating wish:', error);
        alert('创建愿望失败，请稍后重试');
        setIsAnimating(false);
      }
    }, 800);
  };

  const handleOpenAdmin = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setPasswordModalOpen(true);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'tobi7758258') {
      setIsAdminMode(true);
      setPasswordModalOpen(false);
      setAdminPassword('');
    } else {
      alert('密码错误');
    }
  };

  const handleOpenEditDialog = (wish: Wish) => {
    setEditingWish(wish);
    setEditModalOpen(true);
  };

  const handleEditWish = async () => {
    if (!editingWish) return;

    try {
      const response = await fetch('/api/wishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingWish.id,
          destination: editingWish.destination,
          travelYear: editingWish.travel_year,
          travelMonth: editingWish.travel_month,
          wisherName: editingWish.wisher_name,
        }),
      });

      if (response.ok) {
        setEditModalOpen(false);
        setEditingWish(null);
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '更新愿望失败');
      }
    } catch (error) {
      console.error('Error updating wish:', error);
      alert('更新愿望失败，请稍后重试');
    }
  };

  const handleOpenConfirmDialog = (wishId: string) => {
    setConfirmingWishId(wishId);
    setConfirmModalOpen(true);
  };

  const handleConfirmWish = async () => {
    if (!confirmingWishId || !confirmDate || !confirmTravelers) {
      alert('请填写完整的行程信息');
      return;
    }

    try {
      const response = await fetch('/api/wishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: confirmingWishId,
          isConfirmed: 1,
          confirmedDate: confirmDate,
          travelers: confirmTravelers,
        }),
      });

      if (response.ok) {
        setConfirmModalOpen(false);
        setConfirmingWishId('');
        setConfirmDate('');
        setConfirmTravelers('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '确认成行失败');
      }
    } catch (error) {
      console.error('Error confirming wish:', error);
      alert('确认成行失败，请稍后重试');
    }
  };

  const handleOpenDeleteDialog = (wishId: string) => {
    setDeletingWishId(wishId);
    setDeleteModalOpen(true);
  };

  const handleDeleteWish = async () => {
    if (!deletingWishId) return;

    try {
      const response = await fetch('/api/wishes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: deletingWishId,
        }),
      });

      if (response.ok) {
        setDeleteModalOpen(false);
        setDeletingWishId('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '删除愿望失败');
      }
    } catch (error) {
      console.error('Error deleting wish:', error);
      alert('删除愿望失败，请稍后重试');
    }
  };

  const handleOpenEditTripDialog = (wish: Wish) => {
    setEditingTrip(wish);
    setEditTripModalOpen(true);
  };

  const handleEditTrip = async () => {
    if (!editingTrip || !editingTrip.confirmed_date || !editingTrip.travelers) {
      alert('请填写完整的行程信息');
      return;
    }

    try {
      const response = await fetch('/api/wishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTrip.id,
          confirmedDate: editingTrip.confirmed_date,
          travelers: editingTrip.travelers,
        }),
      });

      if (response.ok) {
        setEditTripModalOpen(false);
        setEditingTrip(null);
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '更新行程失败');
      }
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('更新行程失败，请稍后重试');
    }
  };

  const handleOpenFollowDialog = (wishId: string) => {
    setFollowingWishId(wishId);
    setFollowModalOpen(true);
  };

  const handleFollow = async () => {
    if (!followingWishId || !followerName) {
      alert('请输入跟随者姓名');
      return;
    }

    try {
      const response = await fetch('/api/wishes/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishId: followingWishId,
          followerName,
        }),
      });

      if (response.ok) {
        setFollowModalOpen(false);
        setFollowingWishId('');
        setFollowerName('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '跟随失败');
      }
    } catch (error) {
      console.error('Error following wish:', error);
      alert('跟随失败，请稍后重试');
    }
  };

  const handleOpenDeleteFollowerDialog = (wishId: string, followerNameVal: string) => {
    setDeletingFollowerWishId(wishId);
    setDeleteFollowerName(followerNameVal);
    setDeleteFollowerModalOpen(true);
  };

  const handleDeleteFollower = async () => {
    if (!deletingFollowerWishId || !deleteFollowerName) {
      return;
    }

    try {
      const response = await fetch('/api/wishes/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishId: deletingFollowerWishId,
          followerName: deleteFollowerName,
        }),
      });

      if (response.ok) {
        setDeleteFollowerModalOpen(false);
        setDeletingFollowerWishId('');
        setDeleteFollowerName('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '删除跟随者失败');
      }
    } catch (error) {
      console.error('Error deleting follower:', error);
      alert('删除跟随者失败，请稍后重试');
    }
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    if (mainTab === 'wish') {
      return (
        <div className="space-y-6">
          {/* 年度时间轴 */}
          {wishes.some(w => w.is_confirmed === 1) && (
            <Card className="w-full max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm mb-8">
              <CardContent className="pt-6">
                {/* 年度切换 */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => {
                      const years = [...new Set(wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date).map(w => new Date(w.confirmed_date!).getFullYear()))].sort();
                      const currentYearIndex = years.indexOf(selectedYear);
                      if (currentYearIndex > 0) {
                        setSelectedYear(years[currentYearIndex - 1]);
                      }
                    }}
                    className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-[#CEA472]/10 p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    disabled={![...new Set(wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date).map(w => new Date(w.confirmed_date!).getFullYear()))].sort().filter(y => y < selectedYear).length}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-[#CEA472] font-semibold flex items-center gap-2 min-w-[140px] justify-center">
                    <Calendar className="w-5 h-5" />
                    {selectedYear} 旅行计划
                  </h3>
                  <button
                    onClick={() => {
                      const years = [...new Set(wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date).map(w => new Date(w.confirmed_date!).getFullYear()))].sort();
                      const currentYearIndex = years.indexOf(selectedYear);
                      if (currentYearIndex < years.length - 1) {
                        setSelectedYear(years[currentYearIndex + 1]);
                      }
                    }}
                    className="text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-[#CEA472]/10 p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    disabled={![...new Set(wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date).map(w => new Date(w.confirmed_date!).getFullYear()))].sort().filter(y => y > selectedYear).length}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <div className="relative">
                  {/* 时间轴主线 */}
                  <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CEA472]/50 to-transparent" />
                  
                  {/* 月份节点 */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 relative">
                    {monthsShort.map((month, idx) => {
                      const monthNum = idx + 1;
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth() + 1;
                      
                      // 判断月份是否已过：当前年份已过或当前年份中当前月份之后的月份
                      const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && monthNum < currentMonth);
                      
                      const confirmedTrips = wishes.filter(w => {
                        if (w.is_confirmed !== 1 || !w.confirmed_date) return false;
                        const date = new Date(w.confirmed_date);
                        return date.getFullYear() === selectedYear && date.getMonth() + 1 === monthNum;
                      });
                      const hasTrips = confirmedTrips.length > 0;
                      const hasExpiredTrips = confirmedTrips.some(trip => trip.is_expired === 1);
                      const showGray = isPastMonth || hasExpiredTrips;
                      
                      return (
                        <div key={month} className="flex flex-col items-center min-w-0">
                          {/* 月份节点 */}
                          <div 
                            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full relative z-10 transition-all duration-300 ${
                              hasTrips 
                                ? showGray
                                  ? 'bg-gray-400 shadow-lg shadow-gray-400/30' 
                                  : 'bg-[#CEA472] shadow-lg shadow-[#CEA472]/50'
                                : isPastMonth
                                  ? 'bg-gray-400/30'
                                  : 'bg-[#CEA472]/30'
                            }`}
                          />
                          {/* 月份标签 */}
                          <span className={`text-[10px] sm:text-xs mt-3 sm:mt-4 ${
                            hasTrips
                              ? showGray ? 'text-gray-400 font-semibold' : 'text-[#CEA472] font-semibold'
                              : isPastMonth ? 'text-gray-400/50' : 'text-[#FFFFFF]/40'
                          }`}>
                            {month}
                          </span>
                          {/* 已成行旅行标注 - 仅在sm及以上屏幕显示 */}
                          {hasTrips && (
                            <div className="hidden sm:block mt-2 space-y-1 w-full">
                              {confirmedTrips.map(trip => {
                                // 格式化日期为XX月XX日（不显示年份）
                                const dateStr = trip.confirmed_date || '';
                                const dateParts = dateStr.split('-');
                                const formattedDate = dateParts.length >= 3
                                  ? `${dateParts[1]}月${dateParts[2]}日`
                                  : dateStr;
                                const isExpired = trip.is_expired === 1;

                                return (
                                  <div
                                    key={trip.id}
                                    className={`text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded text-center ${
                                      isExpired
                                        ? 'text-[#FFFFFF]/60 bg-gray-500/20'
                                        : 'text-[#FFFFFF] bg-[#CEA472]/20'
                                    }`}
                                  >
                                    <div className={`font-semibold truncate text-[10px] sm:text-xs ${isExpired ? 'text-gray-400' : 'text-[#CEA472]'}`}>{trip.destination}</div>
                                    <div className="text-[#FFFFFF]/60 text-[8px] sm:text-[10px] mt-0.5">{formattedDate}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 手机端：已确认旅行列表 */}
                  <div className="sm:hidden mt-4 space-y-2">
                    {wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date && new Date(w.confirmed_date).getFullYear() === selectedYear)
                      .sort((a, b) => new Date(a.confirmed_date!).getTime() - new Date(b.confirmed_date!).getTime())
                      .map(trip => {
                        // 格式化日期为XX月XX日（不显示年份）
                        const dateStr = trip.confirmed_date || '';
                        const dateParts = dateStr.split('-');
                        const formattedDate = dateParts.length >= 3
                          ? `${dateParts[1]}月${dateParts[2]}日`
                          : dateStr;
                        const isExpired = trip.is_expired === 1;

                        return (
                          <div
                            key={trip.id}
                            className={`flex items-center justify-between text-sm px-3 py-2 rounded ${
                              isExpired
                                ? 'text-[#FFFFFF]/60 bg-gray-500/20'
                                : 'text-[#FFFFFF] bg-[#CEA472]/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isExpired ? 'text-gray-400' : 'text-[#CEA472]'}`}>{trip.destination}</span>
                            </div>
                            <span className="text-[#FFFFFF]/60 text-xs">{formattedDate}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 子标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 lg:w-[500px] lg:mx-auto bg-black/40 backdrop-blur-sm border border-[#CEA472]/20">
              <TabsTrigger
                value="make-wish"
                className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
              >
                抛硬币
              </TabsTrigger>
              <TabsTrigger
                value="wish-pool"
                className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
              >
                许愿池
              </TabsTrigger>
            </TabsList>

            {/* Make Wish Tab */}
            <TabsContent value="make-wish" className="space-y-6">
              <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="flex items-center gap-2 text-[#FFFFFF]">
                      <MapPin className="w-4 h-4 text-[#CEA472]" />
                      目的地
                    </Label>
                    <Input
                      id="destination"
                      placeholder="例如：巴黎、东京、马尔代夫..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="h-11 bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#FFFFFF]">
                      <Calendar className="w-4 h-4 text-[#CEA472]" />
                      希望出行年月
                    </Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM（如：2026-03）"
                      value={travelYearMonth}
                      onChange={(e) => setTravelYearMonth(e.target.value)}
                      className="h-11 bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-[#FFFFFF]">
                      <User className="w-4 h-4 text-[#CEA472]" />
                      许愿人姓名
                    </Label>
                    <Input
                      id="name"
                      placeholder="请输入您的姓名"
                      value={wisherName}
                      onChange={(e) => setWisherName(e.target.value)}
                      className="h-11 bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={handleMakeWish}
                      disabled={isAnimating}
                      className="w-64 h-11 border-0 bg-[#CEA472] text-[#0a0a0f] shadow-lg font-semibold px-8 hover:bg-[#CEA472]/80 disabled:opacity-100 disabled:bg-[#CEA472] disabled:text-[#0a0a0f]"
                    >
                      {isAnimating ? (
                        <div className="flex items-center gap-3">
                          <div className="relative w-6 h-6">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#CEA472] to-[#CEA472]/80 animate-spin" style={{ animationDuration: '0.5s' }}>
                              <div className="absolute inset-1 bg-[#0a0a0f] rounded-full" />
                            </div>
                          </div>
                          <span>抛硬币中...</span>
                        </div>
                      ) : (
                        <span>抛硬币</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isAnimating && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-6">
                      <div 
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#CEA472] to-[#CEA472]/60 shadow-2xl animate-spin"
                        style={{ animationDuration: '0.3s' }}
                      >
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#CEA472]/90 to-[#CEA472]/50" />
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#CEA472] to-[#CEA472]/70 flex items-center justify-center">
                          <span className="text-4xl">💫</span>
                        </div>
                      </div>
                      {/* Ripple effects */}
                      <div className="absolute inset-0 rounded-full border-4 border-[#CEA472]/50 animate-ping" />
                      <div className="absolute -inset-4 rounded-full border-2 border-[#CEA472]/30 animate-ping" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute -inset-8 rounded-full border border-[#CEA472]/20 animate-ping" style={{ animationDelay: '0.4s' }} />
                    </div>
                    {animationComplete ? (
                      <div className="space-y-3">
                        <div className="text-3xl font-bold text-[#CEA472] animate-bounce">✨ 抛硬币成功 ✨</div>
                        <p className="text-lg text-[#FFFFFF]/80">你的愿望已经飘向许愿池...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-2xl font-semibold text-[#CEA472]">正在抛硬币...</p>
                        <p className="text-lg text-[#FFFFFF]/60">闭上眼睛，许下心愿</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Wish Pool Tab */}
            <TabsContent value="wish-pool" className="space-y-6">
              <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#CEA472] border-t-transparent" />
                      <p className="mt-4 text-[#FFFFFF]/60">加载中...</p>
                    </div>
                  ) : wishes.length === 0 ? (
                    <div className="text-center py-12">
                      <Droplets className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                      <p className="text-xl text-[#FFFFFF]/60">许愿池还是空的</p>
                      <p className="text-[#FFFFFF]/40 mt-2">成为第一个许愿的人吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {wishes.map((wish, index) => (
                        <div
                          key={wish.id}
                          className={`group overflow-hidden p-6 rounded-lg border backdrop-blur-sm transition-all duration-500 ${
                            wish.is_expired === 1
                              ? 'border-gray-500/30 bg-gray-500/5'
                              : wish.is_confirmed === 1
                                ? 'border-[#CEA472] bg-[#CEA472]/10' 
                                : 'border-[#CEA472]/10 bg-black/40 hover:border-[#CEA472]/50 hover:bg-black/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-5 h-5 text-[#CEA472]" />
                                <h3 className="text-lg font-bold text-[#FFFFFF]">
                                  {wish.destination}
                                </h3>
                                {wish.is_expired === 1 ? (
                                  <span className="px-2 py-0.5 text-xs bg-gray-500/50 text-gray-300 rounded-full font-semibold">
                                    已过期
                                  </span>
                                ) : wish.is_confirmed === 1 && (
                                  <span className="px-2 py-0.5 text-xs bg-[#CEA472] text-[#0a0a0f] rounded-full font-semibold">
                                    已成行
                                  </span>
                                )}
                              </div>
                              
                              {/* 已成行显示具体信息 */}
                              {wish.is_confirmed === 1 ? (
                                <div className="space-y-2 pl-6 text-[#FFFFFF]/80 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar className={`w-4 h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                    <span className="text-sm">{(() => {
                                      const dateStr = wish.confirmed_date || '';
                                      const dateParts = dateStr.split('-');
                                      return dateParts.length >= 3 ? `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日` : dateStr;
                                    })()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className={`w-4 h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                    <span className="text-sm">{wish.travelers}</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-2 pl-6 text-[#FFFFFF]/80 mb-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4 text-[#CEA472]" />
                                      <span className="text-sm">{wish.travel_year}年{String(months.indexOf(wish.travel_month) + 1).padStart(2, '0')}月</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4 text-[#CEA472]" />
                                      <span className="text-sm">{wish.wisher_name}</span>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* 跟随人信息 - 所有愿望都显示 */}
                              <div className={`text-xs pl-6 ${wish.is_expired === 1 ? 'text-gray-400/50' : 'text-[#FFFFFF]/50'}`}>
                                {wish.followers.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <Heart className={`w-4 h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                      <span className={`text-xs ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`}>{wish.followers.length} 人跟随：</span>
                                    </div>
                                    {wish.followers.map((name, idx) => (
                                      <div key={idx} className={`flex items-center gap-1 px-2 py-0.5 rounded ${wish.is_expired === 1 ? 'bg-gray-500/20 border-gray-500/20' : 'bg-black/30 border border-[#CEA472]/20'}`}>
                                        <span className={`text-xs ${wish.is_expired === 1 ? 'text-gray-400/80' : 'text-[#FFFFFF]/80'}`}>{name}</span>
                                        {isAdminMode && (
                                          <button
                                            onClick={() => handleOpenDeleteFollowerDialog(wish.id, name)}
                                            className="text-red-500 hover:text-red-500 hover:bg-red-500/10 transition-colors p-0.5 rounded"
                                            title="删除跟随者"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Heart className={`w-4 h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                    <span className={`text-xs ${wish.is_expired === 1 ? 'text-gray-400/50' : 'text-[#FFFFFF]/50'}`}>暂无跟随</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* 非管理模式：只显示跟随按钮（已过期不允许跟随） */}
                              {!isAdminMode && wish.is_expired !== 1 && (
                                <Button
                                  onClick={() => handleOpenFollowDialog(wish.id)}
                                  variant="outline"
                                  size="icon"
                                  title="跟随"
                                  className="size-8 bg-black/40 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/20 hover:border-[#CEA472]/50"
                                >
                                  <Heart className="w-4 h-4" />
                                </Button>
                              )}
                              {/* 管理模式：显示编辑、确定成行、删除按钮 */}
                              {isAdminMode && (
                                <>
                                  {wish.is_confirmed === 1 ? (
                                    // 已成行：显示编辑行程按钮
                                    <Button
                                      onClick={() => handleOpenEditTripDialog(wish)}
                                      variant="outline"
                                      size="icon"
                                      title="编辑行程"
                                      className="size-8 bg-black/40 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/20 hover:border-[#CEA472]/50"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    // 未成行：显示编辑和确定成行按钮
                                    <>
                                      <Button
                                        onClick={() => handleOpenEditDialog(wish)}
                                        variant="outline"
                                        size="icon"
                                        title="编辑"
                                        className="size-8 bg-black/40 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/20 hover:border-[#CEA472]/50"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        onClick={() => handleOpenConfirmDialog(wish.id)}
                                        variant="outline"
                                        size="icon"
                                        title="确定成行"
                                        className="size-8 bg-black/40 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/20 hover:border-[#CEA472]/50"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    onClick={() => handleOpenDeleteDialog(wish.id)}
                                    variant="outline"
                                    size="icon"
                                    title="删除"
                                    className="size-8 bg-black/40 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    } else if (mainTab === 'plan') {
      return (
        <div className="space-y-6">
          <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Map className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#FFFFFF] mb-2">旅行规划</h3>
                <p className="text-[#FFFFFF]/60 mb-2">此功能正在开发中...</p>
                <p className="text-sm text-[#FFFFFF]/40">即将支持：行程规划、目的地探索、预算管理</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else if (mainTab === 'account') {
      return (
        <div className="space-y-6">
          <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Coins className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#FFFFFF] mb-2">旅行记账</h3>
                <p className="text-[#FFFFFF]/60 mb-2">此功能正在开发中...</p>
                <p className="text-sm text-[#FFFFFF]/40">即将支持：支出记录、统计分析、账单管理</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else if (mainTab === 'drive') {
      return (
        <div className="space-y-6">
          <Card className="max-w-4xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#FFFFFF] mb-2">旅行驾驶</h3>
                <p className="text-[#FFFFFF]/60 mb-2">此功能正在开发中...</p>
                <p className="text-sm text-[#FFFFFF]/40">即将支持：路线规划、油耗计算、沿途景点</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          backgroundImage: 'url("https://neeko-copilot.bytedance.net/api/text_to_image?prompt=majestic%20Matterhorn%20mountain%20peak%20covered%20in%20snow%20with%20golden%20sunlight%20hitting%20the%20summit%20dramatic%20alpine%20landscape%20at%20dawn%20with%20soft%20pastel%20sky&image_size=landscape_16_9")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* 深色叠加层，确保文字可读 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 内容区域 */}
      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        {/* 标题和管理按钮 */}
        <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Plane className="w-8 h-8 text-[#CEA472]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#FFFFFF] tracking-wide">
              旅行工具箱
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isAdminMode ? 'text-[#CEA472]' : 'text-[#FFFFFF]/40'}`}>管理</span>
            <Switch
              checked={isAdminMode}
              onCheckedChange={handleOpenAdmin}
            />
          </div>
        </div>

        {/* 主标签页 */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-black/40 backdrop-blur-sm border border-[#CEA472]/20 mb-8">
            <TabsTrigger
              value="wish"
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
            >
              <Plane className="w-4 h-4 mr-2" />
              旅行许愿
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
            >
              <Map className="w-4 h-4 mr-2" />
              旅行规划
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
            >
              <Receipt className="w-4 h-4 mr-2" />
              旅行记账
            </TabsTrigger>
            <TabsTrigger
              value="drive"
              className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
            >
              <Car className="w-4 h-4 mr-2" />
              旅行驾驶
            </TabsTrigger>
          </TabsList>

          {/* 主标签页内容 */}
          {renderMainContent()}
        </Tabs>
      </div>

      {/* 密码对话框 */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">进入管理模式</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">请输入管理员密码以进入管理模式</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="admin-password" className="text-[#FFFFFF]">密码</Label>
            <Input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordModalOpen(false)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleAdminLogin}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑愿望</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="edit-destination" className="text-[#FFFFFF]">目的地</Label>
            <Input
              id="edit-destination"
              value={editingWish?.destination || ''}
              onChange={(e) => editingWish && setEditingWish({ ...editingWish, destination: e.target.value })}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year" className="text-[#FFFFFF]">期望年份</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={editingWish?.travel_year || ''}
                  onChange={(e) => editingWish && setEditingWish({ ...editingWish, travel_year: parseInt(e.target.value) })}
                  className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-month" className="text-[#FFFFFF]">期望月份</Label>
                <select
                  id="edit-month"
                  value={editingWish?.travel_month || ''}
                  onChange={(e) => editingWish && setEditingWish({ ...editingWish, travel_month: e.target.value })}
                  className="w-full h-11 rounded-md bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF] px-3"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <Label htmlFor="edit-wisher" className="text-[#FFFFFF]">许愿人</Label>
            <Input
              id="edit-wisher"
              value={editingWish?.wisher_name || ''}
              onChange={(e) => editingWish && setEditingWish({ ...editingWish, wisher_name: e.target.value })}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingWish(null);
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleEditWish}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认成行对话框 */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">确认成行</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="confirm-date" className="text-[#FFFFFF]">出发日期</Label>
            <Input
              id="confirm-date"
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
            />
            <Label htmlFor="confirm-travelers" className="text-[#FFFFFF]">同行人员</Label>
            <Input
              id="confirm-travelers"
              value={confirmTravelers}
              onChange={(e) => setConfirmTravelers(e.target.value)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
              placeholder="例如：张三、李四、王五"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmModalOpen(false);
                setConfirmingWishId('');
                setConfirmDate('');
                setConfirmTravelers('');
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmWish}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除对话框 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">删除愿望</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">确定要删除这个愿望吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeletingWishId('');
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleDeleteWish}
              className="bg-red-500 text-white hover:bg-red-500/80"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑行程对话框 */}
      <Dialog open={editTripModalOpen} onOpenChange={setEditTripModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑行程</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="edit-trip-date" className="text-[#FFFFFF]">出发日期</Label>
            <Input
              id="edit-trip-date"
              type="date"
              value={editingTrip?.confirmed_date || ''}
              onChange={(e) => editingTrip && setEditingTrip({ ...editingTrip, confirmed_date: e.target.value })}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
            />
            <Label htmlFor="edit-trip-travelers" className="text-[#FFFFFF]">同行人员</Label>
            <Input
              id="edit-trip-travelers"
              value={editingTrip?.travelers || ''}
              onChange={(e) => editingTrip && setEditingTrip({ ...editingTrip, travelers: e.target.value })}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
              placeholder="例如：张三、李四、王五"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTripModalOpen(false);
                setEditingTrip(null);
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleEditTrip}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟随对话框 */}
      <Dialog open={followModalOpen} onOpenChange={setFollowModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">跟随愿望</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="follower-name" className="text-[#FFFFFF]">您的姓名</Label>
            <Input
              id="follower-name"
              value={followerName}
              onChange={(e) => setFollowerName(e.target.value)}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFollow();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFollowModalOpen(false);
                setFollowingWishId('');
                setFollowerName('');
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleFollow}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除跟随者对话框 */}
      <Dialog open={deleteFollowerModalOpen} onOpenChange={setDeleteFollowerModalOpen}>
        <DialogContent className="bg-[#0a0a0f] border border-[#CEA472]/20">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">删除跟随者</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">确定要删除跟随者"{deleteFollowerName}"吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteFollowerModalOpen(false);
                setDeletingFollowerWishId('');
                setDeleteFollowerName('');
              }}
              className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleDeleteFollower}
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
