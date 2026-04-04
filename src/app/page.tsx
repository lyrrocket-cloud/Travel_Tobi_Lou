'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Calendar, User, Heart, Sparkles, Settings, Trash2, Droplets, CheckCircle, Edit2 } from 'lucide-react';

interface Wish {
  id: number;
  destination: string;
  travel_year: number;
  travel_month: string;
  wisher_name: string;
  followers_count: number;
  created_at: string;
  followers: string[];
  is_confirmed: number;
  confirmed_date?: string;
  travelers?: string;
  is_pinned: number;
  confirmed_at?: string;
  is_expired?: number;
}

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// 生成年份选项（当前年份到当前年份+3年）
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Home() {
  const [activeTab, setActiveTab] = useState('make-wish');
  const [destination, setDestination] = useState('');
  const [travelYearMonth, setTravelYearMonth] = useState('');
  const [wisherName, setWisherName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // 管理相关状态
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  
  // 成行相关状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmWishId, setConfirmWishId] = useState<number | null>(null);
  const [confirmedDate, setConfirmedDate] = useState('');
  const [travelers, setTravelers] = useState('');
  
  // 编辑相关状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editWishId, setEditWishId] = useState<number | null>(null);
  const [editDestination, setEditDestination] = useState('');
  const [editTravelYearMonth, setEditTravelYearMonth] = useState('');
  const [editWisherName, setEditWisherName] = useState('');
  
  // 编辑行程相关状态（已成行旅行）
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);
  const [editTripWishId, setEditTripWishId] = useState<number | null>(null);
  const [editTripDate, setEditTripDate] = useState('');
  const [editTripTravelers, setEditTripTravelers] = useState('');

  // 跟随相关状态
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followWishId, setFollowWishId] = useState<number | null>(null);
  const [followerName, setFollowerName] = useState('');

  // 删除确认相关状态
  const [showDeleteWishDialog, setShowDeleteWishDialog] = useState(false);
  const [deleteWishId, setDeleteWishId] = useState<number | null>(null);
  const [showDeleteFollowerDialog, setShowDeleteFollowerDialog] = useState(false);
  const [deleteFollowerWishId, setDeleteFollowerWishId] = useState<number | null>(null);
  const [deleteFollowerName, setDeleteFollowerName] = useState('');

  useEffect(() => {
    if (activeTab === 'wish-pool') {
      fetchWishes();
    }
  }, [activeTab]);

  // 初始加载愿望数据（用于时间轴显示）
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

  const fetchWishes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wishes');
      const data = await response.json();
      setWishes(data.wishes || []);
    } catch (error) {
      console.error('Failed to fetch wishes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeWish = async () => {
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

        if (response.ok) {
          setAnimationComplete(true);
          setTimeout(() => {
            setDestination('');
            setTravelYearMonth('');
            setWisherName('');
            setIsAnimating(false);
            setAnimationComplete(false);
            setActiveTab('wish-pool');
          }, 2000);
        } else {
          alert('许愿失败，请重试');
          setIsAnimating(false);
        }
      } catch (error) {
        console.error('Failed to make wish:', error);
        alert('许愿失败，请重试');
        setIsAnimating(false);
      }
    }, 2000);
  };

  const handleFollow = async (wishId: number) => {
    setFollowWishId(wishId);
    setFollowerName('');
    setShowFollowDialog(true);
  };

  const handleConfirmFollow = async () => {
    if (!followWishId || !followerName) {
      alert('请输入您的姓名');
      return;
    }

    try {
      const response = await fetch(`/api/wishes/${followWishId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followerName }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('已成功跟随该愿望！');
        setShowFollowDialog(false);
        setFollowWishId(null);
        setFollowerName('');
        fetchWishes();
      } else {
        alert(data.error || '跟随失败，请重试');
      }
    } catch (error) {
      console.error('Failed to follow wish:', error);
      alert('跟随失败，请重试');
    }
  };

  const handleDeleteWish = async (wishId: number) => {
    setDeleteWishId(wishId);
    setShowDeleteWishDialog(true);
  };

  const handleConfirmDeleteWish = async () => {
    if (!deleteWishId) return;

    try {
      const response = await fetch(`/api/wishes/${deleteWishId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('删除成功！');
        setShowDeleteWishDialog(false);
        setDeleteWishId(null);
        fetchWishes();
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete wish:', error);
      alert('删除失败，请重试');
    }
  };

  const handleDeleteFollower = async (wishId: number, followerName: string) => {
    setDeleteFollowerWishId(wishId);
    setDeleteFollowerName(followerName);
    setShowDeleteFollowerDialog(true);
  };

  const handleConfirmDeleteFollower = async () => {
    if (!deleteFollowerWishId || !deleteFollowerName) return;

    try {
      const response = await fetch(`/api/wishes/${deleteFollowerWishId}/followers/${encodeURIComponent(deleteFollowerName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('删除成功！');
        setShowDeleteFollowerDialog(false);
        setDeleteFollowerWishId(null);
        setDeleteFollowerName('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '删除失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete follower:', error);
      alert('删除失败，请重试');
    }
  };

  const handleAdminLogin = () => {
    if (password === 'tobi7758258') {
      setIsAdminMode(true);
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleOpenConfirmDialog = (wishId: number) => {
    setConfirmWishId(wishId);
    setConfirmedDate('');
    setTravelers('');
    setShowConfirmDialog(true);
  };

  const handleConfirmTrip = async () => {
    if (!confirmWishId || !confirmedDate || !travelers) {
      alert('请填写所有必填项');
      return;
    }

    try {
      const response = await fetch(`/api/wishes/${confirmWishId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmedDate, travelers }),
      });

      if (response.ok) {
        alert('成行确认成功！');
        setShowConfirmDialog(false);
        setConfirmWishId(null);
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '确认失败，请重试');
      }
    } catch (error) {
      console.error('Failed to confirm trip:', error);
      alert('确认失败，请重试');
    }
  };

  const handleOpenEditDialog = (wish: Wish) => {
    setEditWishId(wish.id);
    setEditDestination(wish.destination);
    // 将年份和月份转换为 YYYY-MM 格式
    const monthNum = months.indexOf(wish.travel_month) + 1;
    setEditTravelYearMonth(`${wish.travel_year}-${String(monthNum).padStart(2, '0')}`);
    setEditWisherName(wish.wisher_name);
    setShowEditDialog(true);
  };

  const handleEditWish = async () => {
    if (!editWishId || !editDestination || !editTravelYearMonth || !editWisherName) {
      alert('请填写所有必填项');
      return;
    }

    // 解析 YYYY-MM 格式
    const dateMatch = editTravelYearMonth.match(/^(\d{4})-(\d{2})$/);
    if (!dateMatch) {
      alert('请输入正确的日期格式（YYYY-MM），例如：2026-03');
      return;
    }

    const editTravelYear = parseInt(dateMatch[1]);
    const travelMonthNum = parseInt(dateMatch[2]);
    const editTravelMonth = months[travelMonthNum - 1];

    try {
      const response = await fetch(`/api/wishes/${editWishId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: editDestination,
          travelYear: editTravelYear,
          travelMonth: editTravelMonth,
          wisherName: editWisherName
        }),
      });

      if (response.ok) {
        alert('编辑成功！');
        setShowEditDialog(false);
        setEditWishId(null);
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '编辑失败，请重试');
      }
    } catch (error) {
      console.error('Failed to edit wish:', error);
      alert('编辑失败，请重试');
    }
  };

  // 打开编辑行程对话框
  const handleOpenEditTripDialog = (wish: Wish) => {
    setEditTripWishId(wish.id);
    setEditTripDate(wish.confirmed_date || '');
    setEditTripTravelers(wish.travelers || '');
    setShowEditTripDialog(true);
  };

  // 更新已成行旅行的出发日期和出行人
  const handleEditTrip = async () => {
    if (!editTripWishId || !editTripDate || !editTripTravelers) {
      alert('请填写所有必填项');
      return;
    }

    try {
      const response = await fetch(`/api/wishes/${editTripWishId}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          confirmedDate: editTripDate, 
          travelers: editTripTravelers,
        }),
      });

      if (response.ok) {
        alert('更新成功！');
        setShowEditTripDialog(false);
        setEditTripWishId(null);
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '更新失败，请重试');
      }
    } catch (error) {
      console.error('Failed to edit trip:', error);
      alert('更新失败，请重试');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen relative">
      {/* 固定背景图片层 */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundColor: '#0a0a0f',
          backgroundImage: 'linear-gradient(rgba(10, 10, 15, 0.75), rgba(10, 10, 15, 0.75)), url(/matterhorn-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* 管理按钮 - 右上角 */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => {
            if (isAdminMode) {
              setIsAdminMode(false);
            } else {
              setShowPasswordDialog(true);
            }
          }}
          variant="outline"
          size="icon"
          title={isAdminMode ? "退出管理模式" : "进入管理模式"}
          className={`w-10 h-10 bg-black/40 border-[#CEA472]/30 ${
            isAdminMode
              ? 'bg-[#CEA472] text-[#0a0a0f] border-[#CEA472]'
              : 'text-[#CEA472] hover:bg-[#CEA472]/20 hover:border-[#CEA472]/50'
          } transition-all duration-300`}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            {/* 图标容器 - 金色衬底 + 黑色线框 */}
            <div 
              className="w-20 h-20 flex items-center justify-center rounded-2xl"
              style={{
                backgroundColor: '#CEA472',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              <Heart className="w-10 h-10" style={{ color: '#0a0a0f' }} />
            </div>
            {/* 主标题 */}
            <h1 className="text-5xl font-bold text-[#FFFFFF] drop-shadow-lg">旅行许愿池</h1>
          </div>
        </div>

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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-black/40 backdrop-blur-sm border border-[#CEA472]/20">
            <TabsTrigger
              value="make-wish"
              className="data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-medium text-gray-400 hover:text-white transition-all duration-300"
            >
              抛硬币
            </TabsTrigger>
            <TabsTrigger
              value="wish-pool"
              className="data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-medium text-gray-400 hover:text-white transition-all duration-300"
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
                                          onClick={() => handleDeleteFollower(wish.id, name)}
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
                                onClick={() => handleFollow(wish.id)}
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
                                  onClick={() => handleDeleteWish(wish.id)}
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

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472]">管理员验证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin();
                }
              }}
              className={`bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50 ${
                passwordError ? 'border-red-500' : ''
              }`}
            />
            {passwordError && (
              <p className="text-red-500 text-sm">密码错误，请重试</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleAdminLogin}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              确认
            </Button>
            <Button
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword('');
                setPasswordError(false);
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Trip Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              确定成行
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#CEA472]" />
                出发日期
              </Label>
              <Input
                type="date"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] focus:border-[#CEA472]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <User className="w-4 h-4 text-[#CEA472]" />
                出行人（多人用逗号分隔）
              </Label>
              <Input
                placeholder="例如：张三、李四、王五"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmTrip}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              确认
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmWishId(null);
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Wish Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              编辑愿望
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#CEA472]" />
                目的地
              </Label>
              <Input
                placeholder="例如：巴黎、东京、马尔代夫..."
                value={editDestination}
                onChange={(e) => setEditDestination(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#CEA472]" />
                希望出行年月
              </Label>
              <Input
                type="text"
                placeholder="YYYY-MM（如：2026-03）"
                value={editTravelYearMonth}
                onChange={(e) => setEditTravelYearMonth(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <User className="w-4 h-4 text-[#CEA472]" />
                许愿人姓名
              </Label>
              <Input
                placeholder="请输入许愿人姓名"
                value={editWisherName}
                onChange={(e) => setEditWisherName(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditWish}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              保存
            </Button>
            <Button
              onClick={() => {
                setShowEditDialog(false);
                setEditWishId(null);
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog - 编辑已成行旅行 */}
      <Dialog open={showEditTripDialog} onOpenChange={setShowEditTripDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              编辑行程
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#CEA472]" />
                出发日期
              </Label>
              <Input
                type="date"
                value={editTripDate}
                onChange={(e) => setEditTripDate(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] focus:border-[#CEA472]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <User className="w-4 h-4 text-[#CEA472]" />
                出行人（多人用逗号分隔）
              </Label>
              <Input
                placeholder="例如：张三、李四、王五"
                value={editTripTravelers}
                onChange={(e) => setEditTripTravelers(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditTrip}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              保存
            </Button>
            <Button
              onClick={() => {
                setShowEditTripDialog(false);
                setEditTripWishId(null);
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow Dialog - 跟随愿望 */}
      <Dialog open={showFollowDialog} onOpenChange={setShowFollowDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Heart className="w-5 h-5" />
              跟随愿望
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#FFFFFF] flex items-center gap-2">
                <User className="w-4 h-4 text-[#CEA472]" />
                您的姓名
              </Label>
              <Input
                type="text"
                placeholder="请输入您的姓名"
                value={followerName}
                onChange={(e) => setFollowerName(e.target.value)}
                className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmFollow}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              确认
            </Button>
            <Button
              onClick={() => {
                setShowFollowDialog(false);
                setFollowWishId(null);
                setFollowerName('');
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Wish Confirmation Dialog */}
      <Dialog open={showDeleteWishDialog} onOpenChange={setShowDeleteWishDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              删除愿望
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[#FFFFFF]/80">确定要删除这个愿望吗？</p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmDeleteWish}
              className="bg-red-500 hover:bg-red-600 text-[#FFFFFF]"
            >
              删除
            </Button>
            <Button
              onClick={() => {
                setShowDeleteWishDialog(false);
                setDeleteWishId(null);
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Follower Confirmation Dialog */}
      <Dialog open={showDeleteFollowerDialog} onOpenChange={setShowDeleteFollowerDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              删除跟随人
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[#FFFFFF]/80">确定要删除跟随人"{deleteFollowerName}"吗？</p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmDeleteFollower}
              className="bg-red-500 hover:bg-red-600 text-[#FFFFFF]"
            >
              删除
            </Button>
            <Button
              onClick={() => {
                setShowDeleteFollowerDialog(false);
                setDeleteFollowerWishId(null);
                setDeleteFollowerName('');
              }}
              variant="outline"
              className="bg-[#FFFFFF] border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
