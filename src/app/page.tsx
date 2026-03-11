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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Calendar, User, Heart, Sparkles, Settings, Trash2, Droplets } from 'lucide-react';

interface Wish {
  id: number;
  destination: string;
  travel_month: string;
  wisher_name: string;
  followers_count: number;
  created_at: string;
  followers: string[];
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Droplets className="w-10 h-10 text-[#CEA472] animate-pulse" />
            <h1 className="text-4xl font-bold text-[#CEA472]">
              旅行许愿池
            </h1>
            <Sparkles className="w-10 h-10 text-[#CEA472] animate-pulse" />
          </div>
          <p className="text-[#FFFFFF]/80 text-lg">
            抛下硬币，许下心愿，让梦想照进现实
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-black/40 border border-[#CEA472]/10">
            <TabsTrigger 
              value="make-wish" 
              className="flex items-center gap-2 data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80"
            >
              <Droplets className="w-4 h-4" />
              许愿
            </TabsTrigger>
            <TabsTrigger 
              value="wish-pool" 
              className="flex items-center gap-2 data-[state=active]:bg-[#CEA472] data-[state=active]:text-[#0a0a0f] text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80"
            >
              <Heart className="w-4 h-4" />
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
                  className="w-full h-12 gap-2 bg-[#CEA472] text-[#0a0a0f] shadow-lg font-semibold px-8 border-0 disabled:opacity-100 disabled:bg-[#CEA472] disabled:text-[#0a0a0f]"
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl text-[#CEA472]">
                      <Heart className="w-7 h-7" />
                      许愿池
                    </CardTitle>
                    <p className="text-[#FFFFFF]/60 mt-1">
                      按时间最近和跟随人数排序
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (isAdminMode) {
                        setIsAdminMode(false);
                      } else {
                        setShowPasswordDialog(true);
                      }
                    }}
                    variant="outline"
                    className={`flex items-center gap-2 border-[#CEA472]/30 ${
                      isAdminMode 
                        ? 'bg-[#CEA472]/20 text-[#CEA472]' 
                        : 'text-[#CEA472] hover:bg-[#CEA472]/10'
                    } hover:border-[#CEA472]/50 transition-all duration-500`}
                  >
                    <Settings className="w-4 h-4" />
                    {isAdminMode ? '退出管理' : '管理'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                        className="group overflow-hidden p-6 rounded-lg border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm hover:border-[#CEA472]/50 hover:bg-black/60 transition-all duration-500"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold text-[#CEA472]">
                                #{index + 1}
                              </span>
                              <MapPin className="w-5 h-5 text-[#CEA472]" />
                              <h3 className="text-xl font-bold text-[#FFFFFF]">
                                {wish.destination}
                              </h3>
                            </div>
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
                          <div className="flex items-center gap-2">
                            {!isAdminMode && (
                              <Button
                                onClick={() => handleFollow(wish.id)}
                                variant="outline"
                                className="flex items-center gap-2 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10 hover:border-[#CEA472]/50 transition-all duration-500"
                              >
                                <Heart className="w-4 h-4" />
                                跟随
                              </Button>
                            )}
                            {isAdminMode && (
                              <Button
                                onClick={() => handleDeleteWish(wish.id)}
                                variant="outline"
                                className="flex items-center gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-500"
                              >
                                <Trash2 className="w-4 h-4" />
                                删除
                              </Button>
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
              className="border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10"
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
    </div>
  );
}
