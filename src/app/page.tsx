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
import { Coins, MapPin, Calendar, User, Heart, Sparkles, ChevronRight } from 'lucide-react';

interface Wish {
  id: number;
  destination: string;
  travel_month: string;
  wisher_name: string;
  followers_count: number;
  created_at: string;
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
            <Coins className="w-10 h-10 text-[#CEA472] animate-bounce" />
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
              <Coins className="w-4 h-4" />
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-[#CEA472]">
                  <MapPin className="w-7 h-7" />
                  许下你的旅行愿望
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    className="text-lg bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
                    disabled={isAnimating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month" className="flex items-center gap-2 text-[#FFFFFF]">
                    <Calendar className="w-4 h-4 text-[#CEA472]" />
                    期望出发月份
                  </Label>
                  <Select value={travelMonth} onValueChange={setTravelMonth} disabled={isAnimating}>
                    <SelectTrigger className="text-lg bg-black/40 border-[#CEA472]/30 text-[#FFFFFF]">
                      <SelectValue placeholder="选择月份" className="text-[#FFFFFF]/40" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-[#CEA472]/30">
                      {months.map((month) => (
                        <SelectItem 
                          key={month} 
                          value={month} 
                          className="text-lg text-[#FFFFFF] hover:bg-[#CEA472]/10 focus:bg-[#CEA472]/10"
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
                    className="text-lg bg-black/40 border-[#CEA472]/30 text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 focus:border-[#CEA472]/50"
                    disabled={isAnimating}
                  />
                </div>

                <Button
                  onClick={handleMakeWish}
                  disabled={isAnimating || !destination || !travelMonth || !wisherName}
                  size="lg"
                  className="w-full h-14 gap-2 bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f] shadow-lg font-semibold px-8 border-0 transition-all duration-500"
                >
                  {isAnimating ? (
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#CEA472] to-[#CEA472]/80 animate-spin" style={{ animationDuration: '0.5s' }}>
                          <div className="absolute inset-1 bg-[#0a0a0f] rounded-full" />
                        </div>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl">💰</span>
                      </div>
                      <span>抛掷硬币中...</span>
                    </div>
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      <span>抛下硬币，许下愿望</span>
                      <ChevronRight className="w-4 h-4" />
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
                        <span className="text-4xl">💰</span>
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
                      <p className="text-2xl font-semibold text-[#CEA472]">正在抛掷硬币...</p>
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
                <CardTitle className="flex items-center gap-2 text-2xl text-[#CEA472]">
                  <Heart className="w-7 h-7" />
                  许愿池
                </CardTitle>
                <p className="text-[#FFFFFF]/60">
                  按时间最近和跟随人数排序
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#CEA472] border-t-transparent" />
                    <p className="mt-4 text-[#FFFFFF]/60">加载中...</p>
                  </div>
                ) : wishes.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                    <p className="text-xl text-[#FFFFFF]/60">许愿池还是空的</p>
                    <p className="text-[#FFFFFF]/40 mt-2">成为第一个许愿的人吧！</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wishes.map((wish, index) => (
                      <div
                        key={wish.id}
                        className="group overflow-hidden p-6 rounded-lg border border-[#CEA472]/10 bg-black/40 backdrop-blur-sm hover:border-[#CEA472]/50 hover:bg-black/60 transition-all duration-500 cursor-pointer"
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
                            <div className="flex items-center gap-4 text-sm text-[#FFFFFF]/50">
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-[#CEA472]" />
                                <span>{wish.followers_count} 人跟随</span>
                              </div>
                              <span>{formatDate(wish.created_at)}</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleFollow(wish.id)}
                            variant="outline"
                            className="flex items-center gap-2 border-[#CEA472]/30 text-[#CEA472] hover:bg-[#CEA472]/10 hover:border-[#CEA472]/50 transition-all duration-500"
                          >
                            <Heart className="w-4 h-4" />
                            跟随
                          </Button>
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
    </div>
  );
}
