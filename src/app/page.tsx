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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Calendar, User, Heart, Sparkles, Settings, Trash2, Droplets, CheckCircle, Edit } from 'lucide-react';

interface Wish {
  id: number;
  destination: string;
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
}

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('make-wish');
  const [destination, setDestination] = useState('');
  const [travelMonth, setTravelMonth] = useState('');
  const [wisherName, setWisherName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(false);
  
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
  const [editTravelMonth, setEditTravelMonth] = useState('');
  const [editWisherName, setEditWisherName] = useState('');

  useEffect(() => {
    if (activeTab === 'wish-pool') {
      fetchWishes();
    }
  }, [activeTab]);

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
    if (!destination || !travelMonth || !wisherName) {
      alert('请填写所有必填项');
      return;
    }

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
            travelMonth,
            wisherName,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setAnimationComplete(true);
          setTimeout(() => {
            setDestination('');
            setTravelMonth('');
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
    const followerName = prompt('请输入您的姓名');
    if (!followerName) return;

    try {
      const response = await fetch(`/api/wishes/${wishId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followerName }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('已成功跟随该愿望！');
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
    if (!confirm('确定要删除这个愿望吗？')) return;

    try {
      const response = await fetch(`/api/wishes/${wishId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('删除成功！');
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
    if (!confirm(`确定要删除跟随人"${followerName}"吗？`)) return;

    try {
      const response = await fetch(`/api/wishes/${wishId}/followers/${encodeURIComponent(followerName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('删除成功！');
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
    setEditTravelMonth(wish.travel_month);
    setEditWisherName(wish.wisher_name);
    setShowEditDialog(true);
  };

  const handleEditWish = async () => {
    if (!editWishId || !editDestination || !editTravelMonth || !editWisherName) {
      alert('请填写所有必填项');
      return;
    }

    try {
      const response = await fetch(`/api/wishes/${editWishId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          destination: editDestination, 
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
    <div className="min-h-screen" style={{
      backgroundColor: '#0a0a0f',
      backgroundImage: 'linear-gradient(rgba(10, 10, 15, 0.75), rgba(10, 10, 15, 0.75)), url(/matterhorn-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
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
          className={`w-10 h-10 border-[#CEA472]/40 ${
            isAdminMode 
              ? 'bg-[#CEA472] text-[#0a0a0f] border-[#CEA472]' 
              : 'bg-black/60 backdrop-blur-sm text-[#CEA472]'
          } hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300`}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-black/40 backdrop-blur-sm border border-[#CEA472]/20">
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
            <Card className="max-w-2xl mx-auto border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm">
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
                  <Label htmlFor="month" className="flex items-center gap-2 text-[#FFFFFF]">
                    <Calendar className="w-4 h-4 text-[#CEA472]" />
                    期望出发月份
                  </Label>
                  <Select value={travelMonth} onValueChange={setTravelMonth} disabled={isAnimating}>
                    <SelectTrigger className="h-11 bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]">
                      <SelectValue placeholder="选择月份" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-[#CEA472]/30">
                      {months.map((month) => (
                        <SelectItem 
                          key={month} 
                          value={month} 
                          className="text-[#FFFFFF] hover:bg-[#CEA472]/10 focus:bg-[#CEA472]/10"
                        >
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                <Button
                  onClick={handleMakeWish}
                  disabled={isAnimating}
                  size="lg"
                  className="w-full h-12 gap-2 border-0 bg-[#CEA472] text-[#0a0a0f] shadow-lg font-semibold px-8 disabled:opacity-100 disabled:bg-[#CEA472] disabled:text-[#0a0a0f]"
                >
                  {isAnimating ? (
                    <div className="flex items-center gap-3">
                      <div className="relative w-6 h-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#CEA472] to-[#CEA472]/80 animate-spin" style={{ animationDuration: '0.5s' }}>
                          <div className="absolute inset-1 bg-[#0a0a0f] rounded-full" />
                        </div>
                      </div>
                      <span>许愿中...</span>
                    </div>
                  ) : (
                    <>
                      <Droplets className="w-5 h-5" />
                      <span>许愿</span>
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Coin Animation Overlay */}
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
                      <div className="text-3xl font-bold text-[#CEA472] animate-bounce">✨ 许愿成功 ✨</div>
                      <p className="text-lg text-[#FFFFFF]/80">你的愿望已经飘向许愿池...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-2xl font-semibold text-[#CEA472]">正在许愿...</p>
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
                          wish.is_confirmed 
                            ? 'border-[#CEA472] bg-[#CEA472]/10' 
                            : 'border-[#CEA472]/10 bg-black/40 hover:border-[#CEA472]/50 hover:bg-black/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {wish.is_confirmed && (
                                <CheckCircle className="w-5 h-5 text-[#CEA472]" />
                              )}
                              <span className="text-2xl font-bold text-[#CEA472]">
                                #{index + 1}
                              </span>
                              <MapPin className="w-5 h-5 text-[#CEA472]" />
                              <h3 className="text-xl font-bold text-[#FFFFFF]">
                                {wish.destination}
                              </h3>
                              {wish.is_confirmed && (
                                <span className="px-2 py-0.5 text-xs bg-[#CEA472] text-[#0a0a0f] rounded-full font-semibold">
                                  已成行
                                </span>
                              )}
                            </div>
                            
                            {/* 已成行显示具体信息 */}
                            {wish.is_confirmed ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-4 text-[#FFFFFF]/80">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-[#CEA472]" />
                                    <span className="text-[#CEA472] font-semibold">出发日期：{wish.confirmed_date}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-[#FFFFFF]/80">
                                  <User className="w-4 h-4 text-[#CEA472]" />
                                  <span className="text-[#CEA472] font-semibold">出行人：{wish.travelers}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4 text-[#FFFFFF]/80 mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-[#CEA472]" />
                                  <span>{wish.travel_month}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-[#CEA472]" />
                                  <span>{wish.wisher_name}</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-[#FFFFFF]/50 text-sm">
                              {wish.followers.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-4 h-4 text-[#CEA472]" />
                                    <span className="text-[#CEA472]">{wish.followers.length} 人跟随：</span>
                                  </div>
                                  {wish.followers.map((name, idx) => (
                                    <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded bg-black/30 border border-[#CEA472]/20">
                                      <span className="text-[#FFFFFF]/80 text-sm">{name}</span>
                                      {isAdminMode && (
                                        <button
                                          onClick={() => handleDeleteFollower(wish.id, name)}
                                          className="text-red-500 hover:text-red-400 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Heart className="w-4 h-4 text-[#CEA472]" />
                                  <span>暂无跟随</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 非管理模式：只显示跟随按钮 */}
                            {!wish.is_confirmed && !isAdminMode && (
                              <Button
                                onClick={() => handleFollow(wish.id)}
                                variant="outline"
                                className="flex items-center gap-2 border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
                              >
                                <Heart className="w-4 h-4" />
                                跟随
                              </Button>
                            )}
                            {/* 管理模式：显示编辑、确定成行、删除按钮 */}
                            {isAdminMode && (
                              <>
                                <Button
                                  onClick={() => handleOpenEditDialog(wish)}
                                  variant="outline"
                                  className="flex items-center gap-2 border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
                                >
                                  <Edit className="w-4 h-4" />
                                  编辑
                                </Button>
                                {!wish.is_confirmed && (
                                  <Button
                                    onClick={() => handleOpenConfirmDialog(wish.id)}
                                    variant="outline"
                                    className="flex items-center gap-2 border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    确定成行
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleDeleteWish(wish.id)}
                                  variant="outline"
                                  className="flex items-center gap-2 border-red-500/40 bg-black/40 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  删除
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
            <DialogDescription className="text-[#FFFFFF]/60">
              请输入管理密码以进入管理模式
            </DialogDescription>
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
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword('');
                setPasswordError(false);
              }}
              variant="outline"
              className="border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
            >
              取消
            </Button>
            <Button
              onClick={handleAdminLogin}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              确认
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
            <DialogDescription className="text-[#FFFFFF]/60">
              录入具体出行信息，确认后将置顶显示
            </DialogDescription>
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
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmWishId(null);
              }}
              variant="outline"
              className="border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmTrip}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              确认成行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Wish Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#0a0a0f] border-[#CEA472]/30 text-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#CEA472] flex items-center gap-2">
              <Edit className="w-5 h-5" />
              编辑愿望
            </DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">
              修改愿望的相关信息
            </DialogDescription>
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
                期望出发月份
              </Label>
              <Select value={editTravelMonth} onValueChange={setEditTravelMonth}>
                <SelectTrigger className="bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]">
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-[#CEA472]/30">
                  {months.map((month) => (
                    <SelectItem 
                      key={month} 
                      value={month} 
                      className="text-[#FFFFFF] hover:bg-[#CEA472]/10 focus:bg-[#CEA472]/10"
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={() => {
                setShowEditDialog(false);
                setEditWishId(null);
              }}
              variant="outline"
              className="border-[#CEA472]/40 bg-black/40 text-[#CEA472] hover:bg-[#CEA472] hover:text-[#0a0a0f] hover:border-[#CEA472] transition-all duration-300"
            >
              取消
            </Button>
            <Button
              onClick={handleEditWish}
              className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f]"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
