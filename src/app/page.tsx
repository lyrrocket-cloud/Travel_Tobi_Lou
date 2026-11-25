'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Plus, Heart, MapPin, Calendar, User, Edit2, CheckCircle, Trash2, Droplets, Plane, Route, Coins, XCircle, Snowflake, Share2, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TripPlanner from '@/components/TripPlanner';
import TripAccounting from '@/components/TripAccounting';
import TripDriving from '@/components/TripDriving';
import { Wish } from '@/types';
import { useTabTransition, TabSwitchSkeleton } from '@/components/motion/TabTransition';
import { ToolTabNav, type ToolTab } from '@/components/ToolTabNav';
import { GlobalBackground } from '@/components/GlobalBackground';
import {
  readUrlState,
  writeUrlState,
  serializeUrlState,
  type MainTab as UrlMainTab,
} from '@/lib/url-state';

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const monthsShort = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

// 中文月份名称到数字的映射
const monthNameToNum: Record<string, number> = {
  '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6,
  '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11, '十二月': 12
};

// 统一日期格式化函数 - 格式化为YYYY-MM
const formatDateToYYYYMM = (year: number | string, month: number | string): string => {
  const yearStr = typeof year === 'number' ? String(year) : year;
  const monthStr = typeof month === 'number' ? String(month).padStart(2, '0') : month.padStart(2, '0');
  return `${yearStr}-${monthStr}`;
};

// 从YYYY-MM-DD格式中提取YYYY-MM
const extractYYYYMMFromDate = (dateStr: string): string => {
  const dateParts = dateStr.split('-');
  if (dateParts.length >= 2) {
    return `${dateParts[0]}-${dateParts[1]}`;
  }
  return dateStr;
};

// 服务端与客户端首帧统一使用默认导航状态，避免 hydration 不匹配；
// URL/localStorage 状态在客户端挂载后的 layout effect 中恢复（绘制前完成，不闪烁）。
const DEFAULT_MAIN_TAB: UrlMainTab = 'wish';
const DEFAULT_WISH_SUB = 'make-wish';
const DEFAULT_PLAN_DAY = 1;
const DEFAULT_ACCOUNT_SUB = 'entry';
const DEFAULT_DRIVE_SUB = 'entry';

export default function Home() {
  const [destination, setDestination] = useState('');
  const [travelYearMonth, setTravelYearMonth] = useState('');
  const [wisherName, setWisherName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWish, setEditingWish] = useState<Wish | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmingWishId, setConfirmingWishId] = useState<string>('');
  const [cancelConfirmModalOpen, setCancelConfirmModalOpen] = useState(false);
  const [cancelingWishId, setCancelingWishId] = useState<string>('');
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTravelers, setConfirmTravelers] = useState('');
  const [confirmTravelDays, setConfirmTravelDays] = useState('3');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingWishId, setDeletingWishId] = useState<string>('');
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Wish | null>(null);
  // 新增：编辑旅行信息的统一状态（包含出发日期、天数和同行人）
  const [tripInfoEditModalOpen, setTripInfoEditModalOpen] = useState(false);
  const [editingTripInfo, setEditingTripInfo] = useState<{
    id: string;
    confirmed_date?: string;
    travelDays?: number;
    travelers?: string;
    destination?: string;
  } | null>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followingWishId, setFollowingWishId] = useState<string>('');
  const [followerName, setFollowerName] = useState('');
  const [deleteFollowerModalOpen, setDeleteFollowerModalOpen] = useState(false);
  const [deletingFollowerWishId, setDeletingFollowerWishId] = useState<string>('');
  const [deleteFollowerName, setDeleteFollowerName] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tripFrozenStatus, setTripFrozenStatus] = useState<Record<string, boolean>>({});

  const [mainTab, setMainTab] = useState<UrlMainTab>(DEFAULT_MAIN_TAB);
  // 旅行工具共用的当前行程（页面级持有，切换工具时头部不重挂载）
  const [selectedToolWishId, setSelectedToolWishId] = useState<string | null>(null);
  const [toolWishSelectorOpen, setToolWishSelectorOpen] = useState(false);
  const [tripDays, setTripDays] = useState<Record<string, number>>({});
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  const [defaultTripLoaded, setDefaultTripLoaded] = useState(false);
  // 受控的子页面导航状态：页面级唯一来源，与 URL 同步，通过 props 下发给子组件
  const [planDay, setPlanDay] = useState<number>(DEFAULT_PLAN_DAY);
  const [accountSub, setAccountSub] = useState<string>(DEFAULT_ACCOUNT_SUB);
  const [driveSub, setDriveSub] = useState<string>(DEFAULT_DRIVE_SUB);
  // 记账查询筛选（仅 URL 提供时初始化为非空，用于分享还原）
  const [accountFilters, setAccountFilters] = useState<import('@/lib/url-state').AccountQueryFilters | null>(null);

  // 跳转到旅行规划页面并选中对应的愿望
  const navigateToPlan = (wishId: string | number) => {
    // 保存选中的愿望 ID
    localStorage.setItem('travel-toolbox-selected-wish-id', String(wishId));
    setSelectedToolWishId(String(wishId));
    // 切换到规划标签页
    setMainTab('plan');
    // 保存当前标签页选择
    localStorage.setItem('travel-toolbox-main-tab', 'plan');
    // 通知 TripPlanner 切换到对应的愿望
    window.dispatchEvent(new CustomEvent('selected-wish-changed', { detail: { wishId: String(wishId) } }));
  };

  const [activeTab, setActiveTab] = useState<string>(DEFAULT_WISH_SUB);
  const wishTabTransition = useTabTransition();
  const mainTabTransition = useTabTransition();

  // 客户端挂载后恢复导航状态：URL 优先，其次 localStorage，最后默认值。
  // 放在 layout effect 中，在浏览器绘制前完成，分享链接不会先闪默认页；
  // 同时保证服务端首帧与客户端首帧一致，避免 hydration 不匹配。
  useLayoutEffect(() => {
    const url = readUrlState();
    setMainTab((url.tab || localStorage.getItem('travel-toolbox-main-tab') || DEFAULT_MAIN_TAB) as UrlMainTab);

    if (url.tab === 'wish' && url.sub) {
      setActiveTab(url.sub);
    } else {
      setActiveTab(localStorage.getItem('travel-toolbox-active-tab') || DEFAULT_WISH_SUB);
    }

    if (url.wish) {
      setSelectedToolWishId(url.wish);
    } else {
      setSelectedToolWishId(localStorage.getItem('travel-toolbox-selected-wish-id'));
    }

    if (url.tab === 'plan' && url.day) {
      setPlanDay(url.day);
    } else {
      const savedDay = localStorage.getItem('travel-toolbox-selected-day');
      const n = savedDay ? parseInt(savedDay, 10) : NaN;
      setPlanDay(Number.isFinite(n) && n >= 1 ? n : DEFAULT_PLAN_DAY);
    }

    setAccountSub(
      url.tab === 'account' && url.sub
        ? url.sub
        : localStorage.getItem('travel-toolbox-account-tab') || DEFAULT_ACCOUNT_SUB
    );
    setDriveSub(
      url.tab === 'drive' && url.sub
        ? url.sub
        : localStorage.getItem('travel-toolbox-drive-tab') || DEFAULT_DRIVE_SUB
    );
    if (url.filters) setAccountFilters(url.filters);
  }, []);

  // 当前导航状态的唯一序列化快照（供 URL 同步与分享使用，保证地址栏与真实状态一致）
  const currentUrlState = {
    tab: mainTab as UrlMainTab,
    sub:
      mainTab === 'wish'
        ? activeTab
        : mainTab === 'account'
        ? accountSub
        : mainTab === 'drive'
        ? driveSub
        : null,
    wish: mainTab !== 'wish' ? selectedToolWishId : null,
    day: mainTab === 'plan' ? planDay : null,
    filters: mainTab === 'account' ? accountFilters : null,
  };

  // 从 localStorage 加载非导航类初始值（导航状态已由 useState 懒初始化，URL 优先）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedYear = localStorage.getItem('travel-toolbox-selected-year');
      if (savedYear) setSelectedYear(parseInt(savedYear, 10));
    }
  }, []);

  // 保存 selectedYear 到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel-toolbox-selected-year', String(selectedYear));
    }
  }, [selectedYear]);

  // 导航状态变化时：同步写入 URL（单一事实来源，replaceState 不产生历史）与 localStorage 缓存。
  // 写完整快照保证切换主标签时不会残留过期的 sub/day/filters 参数。
  // 首次提交时导航状态尚未从 URL 恢复，跳过以免把分享链接参数冲掉。
  const skipFirstUrlSync = useRef(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipFirstUrlSync.current) {
      skipFirstUrlSync.current = false;
      return;
    }
    writeUrlState(currentUrlState);
    localStorage.setItem('travel-toolbox-main-tab', mainTab);
    localStorage.setItem('travel-toolbox-active-tab', activeTab);
    if (selectedToolWishId) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedToolWishId);
    }
    if (mainTab === 'plan') {
      localStorage.setItem('travel-toolbox-selected-day', String(planDay));
    }
    if (mainTab === 'account') {
      localStorage.setItem('travel-toolbox-account-tab', accountSub);
    }
    if (mainTab === 'drive') {
      localStorage.setItem('travel-toolbox-drive-tab', driveSub);
    }
  }, [mainTab, activeTab, selectedToolWishId, planDay, accountSub, driveSub, accountFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // 分享按钮：生成当前页面状态的链接并复制到剪贴板
  const [shareSuccess, setShareSuccess] = useState(false);
  const handleShare = async () => {
    // 直接基于当前真实 React 状态序列化，不读取可能过期的 localStorage
    const qs = serializeUrlState(currentUrlState);
    const shareUrl = qs
      ? `${window.location.origin}${window.location.pathname}?${qs}`
      : `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch {
      // 剪贴板不可用时降级：手动复制
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  // 挂载后通知仍基于事件同步行程的子组件（导航状态本身已由 useState 懒初始化从 URL 读取，URL 优先）。
  // 不再清除 URL 参数：地址栏始终反映真实状态，便于刷新保持与分享直接复制当前链接。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedToolWishId) {
      window.dispatchEvent(
        new CustomEvent('selected-wish-changed', { detail: { wishId: selectedToolWishId } })
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 恢复滚动位置
  useEffect(() => {
    const savedScrollY = localStorage.getItem('travel-toolbox-scroll-y');
    if (savedScrollY) {
      // 延迟执行以确保页面内容已加载
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      }, 100);
    }

    // 监听滚动事件，保存滚动位置
    const handleScroll = () => {
      localStorage.setItem('travel-toolbox-scroll-y', String(window.scrollY));
    };

    // 使用节流来避免频繁写入
    let scrollTimeout: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledHandleScroll);

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);

  // 加载愿望数据
  const fetchWishes = async () => {
    console.log('[Page] Fetching wishes...');
    setLoading(true);
    try {
      const response = await fetch('/api/wishes');
      const data = await response.json();
      console.log('[Page] Fetch wishes response:', data);
      const wishesData = data.wishes || [];
      setWishes(wishesData);
      
      // 加载所有已确认行程的冻结状态
      const confirmedWishes = wishesData.filter((w: Wish) => w.is_confirmed === 1);
      if (confirmedWishes.length > 0) {
        const frozenStatus: Record<string, boolean> = {};
        const daysStatus: Record<string, number> = {};
        for (const wish of confirmedWishes) {
          try {
            const planRes = await fetch(`/api/trip-plans?wishId=${wish.id}`);
            const planData = await planRes.json();
            if (planData.tripPlans && planData.tripPlans.length > 0) {
              const plan = planData.tripPlans[0];
              frozenStatus[String(wish.id)] = !!plan.frozen;
              daysStatus[String(wish.id)] = plan.travelDays || plan.travel_days || 3;
            }
          } catch (e) {
            // 忽略单个行程的加载错误
          }
        }
        setTripFrozenStatus(frozenStatus);
        setTripDays(daysStatus);
      }
      
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

  // 读取默认旅行（用于首次进入旅行工具时选择行程）
  useEffect(() => {
    fetch('/api/default-trip')
      .then(res => res.json())
      .then(data => {
        if (data?.wishId) setDefaultTripId(String(data.wishId));
      })
      .catch(() => {
        // 忽略默认旅行读取失败
      })
      .finally(() => setDefaultTripLoaded(true));
  }, []);

  // 与三个旅行工具组件保持选中行程同步
  useEffect(() => {
    const handleSelectedWishChanged = (event: Event) => {
      const wishId = (event as CustomEvent).detail?.wishId;
      if (!wishId || wishId === '__overview__') return;
      setSelectedToolWishId(prev => (prev === String(wishId) ? prev : String(wishId)));
    };
    window.addEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    return () => {
      window.removeEventListener('selected-wish-changed', handleSelectedWishChanged as EventListener);
    };
  }, []);

  // 校验选中行程；无效时回退到默认旅行或最新确认的旅行
  useEffect(() => {
    if (loading || !defaultTripLoaded) return;
    const confirmedWishes = wishes.filter(w => w.is_confirmed === 1);
    if (confirmedWishes.length === 0) return;
    const isValid = (id: string | null) => !!id && confirmedWishes.some(w => String(w.id) === id);
    if (isValid(selectedToolWishId)) {
      localStorage.setItem('travel-toolbox-selected-wish-id', selectedToolWishId!);
      return;
    }
    const fallbackId = isValid(defaultTripId)
      ? defaultTripId!
      : String([...confirmedWishes].sort((a, b) => (b.confirmed_date || '').localeCompare(a.confirmed_date || ''))[0].id);
    setSelectedToolWishId(fallbackId);
    localStorage.setItem('travel-toolbox-selected-wish-id', fallbackId);
    window.dispatchEvent(new CustomEvent('selected-wish-changed', { detail: { wishId: fallbackId } }));
  }, [loading, wishes, selectedToolWishId, defaultTripId, defaultTripLoaded]);

  // 选中旅行工具中的行程
  const handleToolWishSelect = (wish: Wish) => {
    const wishId = String(wish.id);
    setSelectedToolWishId(wishId);
    localStorage.setItem('travel-toolbox-selected-wish-id', wishId);
    setToolWishSelectorOpen(false);
    window.dispatchEvent(new CustomEvent('selected-wish-changed', { detail: { wishId } }));
  };

  // 切换旅行工具（规划 / 记账 / 驾驶），只替换下方内容
  const handleToolTabChange = (tab: ToolTab) => {
    if (tab === mainTab) return;
    mainTabTransition.switchTo(tab, () => setMainTab(tab));
  };

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



  const handleAdminLogin = () => {
    // 支持多个管理员密码
    const validPasswords = ['tobi7758258', 'foto1234'];
    if (validPasswords.includes(adminPassword)) {
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

  const handleOpenCancelConfirmDialog = (wishId: string) => {
    setCancelingWishId(wishId);
    setCancelConfirmModalOpen(true);
  };

  const handleCancelConfirmWish = async () => {
    if (!cancelingWishId) {
      return;
    }

    try {
      // 取消成行状态
      const response = await fetch('/api/wishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cancelingWishId,
          isConfirmed: 0,
          confirmedDate: '',
          travelers: '',
        }),
      });

      if (response.ok) {
        setCancelConfirmModalOpen(false);
        setCancelingWishId('');
        fetchWishes();
      } else {
        const data = await response.json();
        alert(data.error || '取消成行失败');
      }
    } catch (error) {
      console.error('Error canceling confirmation:', error);
      alert('取消成行失败，请稍后重试');
    }
  };

  const handleConfirmWish = async () => {
    if (!confirmingWishId || !confirmDate || !confirmTravelers || !confirmTravelDays) {
      alert('请填写完整的行程信息');
      return;
    }
    // 仅允许 YYYY-MM-DD 日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmDate)) {
      alert('出发日期格式不正确，请使用 YYYY-MM-DD 格式');
      return;
    }

    try {
      // 首先确认愿望成行
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
        // 找到对应的愿望信息（确保类型一致）
        const wish = wishes.find(w => String(w.id) === confirmingWishId);
        if (wish) {
          // 创建旅行规划
          try {
            await fetch('/api/trip-plans', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wishId: confirmingWishId,
                destination: wish.destination,
                startDate: confirmDate,
                travelDays: parseInt(confirmTravelDays),
                travelers: confirmTravelers,
              }),
            });
          } catch (planError) {
            console.error('Error creating trip plan:', planError);
          }
        }

        setConfirmModalOpen(false);
        setConfirmingWishId('');
        setConfirmDate('');
        setConfirmTravelers('');
        setConfirmTravelDays('3');
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

  // 打开统一的旅行信息编辑对话框
  const handleOpenTripInfoEdit = (info: {
    id: string;
    confirmed_date?: string;
    travelDays?: number;
    travelers?: string;
    destination?: string;
  }) => {
    setEditingTripInfo(info);
    setTripInfoEditModalOpen(true);
  };

  // 保存统一的旅行信息编辑
  const handleSaveTripInfo = async () => {
    if (!editingTripInfo) return;

    // 验证必填字段
    if (!editingTripInfo.confirmed_date) {
      alert('请填写出发日期');
      return;
    }
    if (!editingTripInfo.travelers) {
      alert('请填写同行人员');
      return;
    }
    if (!editingTripInfo.travelDays || editingTripInfo.travelDays < 1) {
      alert('请填写有效的旅行天数');
      return;
    }

    try {
      // 调用愿望更新API
      const response = await fetch('/api/wishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTripInfo.id,
          confirmedDate: editingTripInfo.confirmed_date,
          travelers: editingTripInfo.travelers,
        }),
      });

      if (response.ok) {
        // 如果旅行天数有变化，需要更新旅行规划
        const existingPlanRes = await fetch(`/api/trip-plans?wishId=${editingTripInfo.id}`);
        const planData = await existingPlanRes.json();
        
        if (planData.tripPlans && planData.tripPlans.length > 0) {
          const plan = planData.tripPlans[0];
          // 兼容数据库返回的 snake_case 和 camelCase 格式
          const currentTravelDays = plan.travelDays || plan.travel_days || 3;
          
          // 如果天数不同，需要调整days数组
          if (currentTravelDays !== editingTripInfo.travelDays) {
            let updatedDays = [...plan.days];
            
            if (editingTripInfo.travelDays! > currentTravelDays) {
              // 增加天数
              const daysToAdd = editingTripInfo.travelDays! - currentTravelDays;
              for (let i = 0; i < daysToAdd; i++) {
                updatedDays.push({
                  id: `day-${currentTravelDays + i + 1}-${Date.now()}`,
                  dayNumber: currentTravelDays + i + 1,
                  activities: [],
                  transport: [],
                });
              }
            } else {
              // 减少天数
              updatedDays = updatedDays.slice(0, editingTripInfo.travelDays);
            }

            // 更新旅行规划
            await fetch('/api/trip-plans', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: plan.id,
                travelDays: editingTripInfo.travelDays,
                days: updatedDays,
              }),
            });
          } else {
            // 只更新出发日期
            await fetch('/api/trip-plans', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: plan.id,
                startDate: editingTripInfo.confirmed_date,
                travelers: editingTripInfo.travelers,
              }),
            });
          }
        }

        setTripInfoEditModalOpen(false);
        setEditingTripInfo(null);
        fetchWishes();
        // 触发TripPlanner刷新
        window.dispatchEvent(new Event('tripPlansUpdated'));
      } else {
        const data = await response.json();
        alert(data.error || '更新旅行信息失败');
      }
    } catch (error) {
      console.error('Error updating trip info:', error);
      alert('更新旅行信息失败，请稍后重试');
    }
  };

  const handleOpenFollowDialog = (wishId: string) => {
    setFollowingWishId(wishId);
    setFollowModalOpen(true);
  };

  // 处理时间轴中点击未成行愿望：跳转到许愿池并打开跟随对话框
  const handleUnconfirmedWishClick = (wishId: string | number) => {
    setFollowingWishId(String(wishId));
    setFollowerName('');
    setActiveTab('wish-pool');
    // 延迟打开跟随对话框，确保标签页已切换
    setTimeout(() => {
      setFollowModalOpen(true);
    }, 100);
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

  // 冻结/解冻行程
  const toggleFreezeTrip = async (wishId: string) => {
    console.log('[Page] toggleFreezeTrip called, wishId:', wishId, 'isAdminMode:', isAdminMode);
    
    if (!isAdminMode) {
      console.warn('[Page] 请先开启管理员模式');
      return;
    }
    
    try {
      // 获取对应的旅行规划
      console.log('[Page] Fetching trip plan for wishId:', wishId);
      const res = await fetch(`/api/trip-plans?wishId=${wishId}`);
      const data = await res.json();
      console.log('[Page] Trip plan response:', data);
      
      if (!data.tripPlans || data.tripPlans.length === 0) {
        console.warn('[Page] 未找到对应的旅行规划');
        return;
      }
      
      const tripPlan = data.tripPlans[0];
      const newFrozenState = !tripPlan.frozen;
      console.log('[Page] Current frozen state:', tripPlan.frozen, 'New frozen state:', newFrozenState);
      
      const response = await fetch('/api/trip-plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tripPlan.id,
          frozen: newFrozenState,
        }),
      });

      console.log('[Page] PUT response status:', response.status);
      
      if (response.ok) {
        // 更新本地状态
        setTripFrozenStatus(prev => ({
          ...prev,
          [wishId]: newFrozenState
        }));
        // 触发事件通知其他组件
        window.dispatchEvent(new CustomEvent('tripPlansUpdated'));
        console.log('[Page] 操作成功:', newFrozenState ? '冻结' : '解冻');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Page] Failed to toggle freeze:', errorData);
      }
    } catch (error) {
      console.error('[Page] Failed to toggle freeze:', error);
    }
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    // 所有切换行程界面按出发日期倒序排列（新的在前）
    const sortedConfirmedWishes = [...wishes.filter(w => w.is_confirmed === 1)].sort((a, b) => {
      const dateA = a.confirmed_date || '';
      const dateB = b.confirmed_date || '';
      return dateB.localeCompare(dateA);
    });
    if (mainTab === 'wish') {
      return (
        <div className="space-y-5">
          {/* 年度时间轴（常驻渲染，加载期用骨架占位，避免数据到达后整页下推） */}
          <Card className="w-full max-w-7xl mx-auto bg-black/60 mb-5">
            <CardContent className="pt-3.5 sm:pt-6 px-2.5 sm:px-6">
                {/* 年度切换 */}
                <div className="flex items-center justify-center gap-2.5 sm:gap-4 mb-3.5 sm:mb-6">
                  <button
                    aria-label={`切换到 ${selectedYear - 1} 年`}
                    onClick={() => {
                      if (selectedYear > 2025) {
                        setSelectedYear(selectedYear - 1);
                      }
                    }}
                    className="hit-expand hit-expand-icon text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-[#CEA472]/10 p-2 rounded-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    disabled={selectedYear <= 2025}
                  >
                    <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-[#CEA472] font-semibold flex items-center gap-1.5 sm:gap-2 min-w-[100px] sm:min-w-[140px] justify-center text-sm sm:text-base md:text-lg">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:w-5 sm:h-5" />
                    {selectedYear} 旅行计划
                  </h2>
                  <button
                    aria-label={`切换到 ${selectedYear + 1} 年`}
                    onClick={() => {
                      if (selectedYear < 2030) {
                        setSelectedYear(selectedYear + 1);
                      }
                    }}
                    className="hit-expand hit-expand-icon text-[#CEA472] hover:text-[#CEA472]/80 hover:bg-[#CEA472]/10 p-2 rounded-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    disabled={selectedYear >= 2030}
                  >
                    <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {loading ? (
                  /* 骨架占位高度与最终内容一致（含月份行 33px + 移动端列表），避免加载完成时整页下推 */
                  <div className="min-h-[663px] sm:min-h-[147px] flex flex-col gap-3 pt-1">
                    <div className="skeleton-shimmer h-[24px] sm:h-[32px] w-full shrink-0" />
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="skeleton-shimmer flex-1 w-full" />
                    ))}
                  </div>
                ) : (
                <div className="relative">
                  {/* 时间轴主线 */}
                  <div className="absolute top-4.5 sm:top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CEA472]/50 to-transparent" />
                  
                  {/* 月份节点：移动端横向滚动 + scroll-snap，桌面端保持 12 列 */}
                  <div className="-mx-2.5 sm:mx-0">
                    <div className="grid grid-flow-col auto-cols-[16.6667%] gap-0.5 overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pt-0.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-12 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-2 sm:[mask-image:none]">
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
                      
                      // 获取未成行的愿望（根据预计出行年月）
                      const unconfirmedWishes = wishes.filter(w => {
                        if (w.is_confirmed === 1) return false;
                        if (!w.travel_year || !w.travel_month) return false;
                        const wishMonthNum = monthNameToNum[w.travel_month] || parseInt(w.travel_month);
                        return w.travel_year === selectedYear && wishMonthNum === monthNum;
                      });
                      
                      const hasTrips = confirmedTrips.length > 0;
                      const hasUnconfirmed = unconfirmedWishes.length > 0;
                      const hasAnyWishes = hasTrips || hasUnconfirmed;
                      const hasExpiredTrips = confirmedTrips.some(trip => trip.is_expired === 1);
                      const showGray = isPastMonth || hasExpiredTrips;
                      
                      return (
                        <div key={month} className="flex flex-col items-center min-w-0 snap-start">
                          {/* 月份节点 */}
                          <div 
                            className={`w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-full relative z-10 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                              hasAnyWishes 
                                ? showGray
                                  ? 'bg-gray-400 shadow-lg shadow-gray-400/30' 
                                  : 'bg-[#CEA472] shadow-lg shadow-[#CEA472]/50'
                                : isPastMonth
                                  ? 'bg-gray-400/30'
                                  : 'bg-[#CEA472]/30'
                            }`}
                          />
                          {/* 月份标签 */}
                          <span className={`text-xs text-center leading-normal pb-1 mt-2 sm:mt-4 ${
                            hasAnyWishes
                              ? showGray ? 'text-gray-400 font-semibold' : 'text-[#CEA472] font-semibold'
                              : isPastMonth ? 'text-gray-400/50' : 'text-[#FFFFFF]/40'
                          }`}>
                            {month}
                          </span>
                          {/* 已成行旅行标注 - 仅在sm及以上屏幕显示 */}
                          {(hasTrips || hasUnconfirmed) && (
                            <div className="hidden sm:block mt-2 space-y-1 w-full">
                              {confirmedTrips.map(trip => {
                                // 格式化日期为YYYY-MM
                                const dateStr = trip.confirmed_date || '';
                                const formattedDate = extractYYYYMMFromDate(dateStr);
                                const isExpired = trip.is_expired === 1;

                                return (
                                  <div
                                    key={trip.id}
                                    onClick={() => navigateToPlan(trip.id)}
                                    className={`text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-none text-center cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                      isExpired
                                        ? 'text-[#FFFFFF]/60 bg-gray-500/20 hover:bg-gray-500/30'
                                        : 'text-[#FFFFFF] bg-[#CEA472]/20 hover:bg-[#CEA472]/30'
                                    }`}
                                  >
                                    <div className={`font-semibold truncate text-xs ${isExpired ? 'text-gray-400' : 'text-[#CEA472]'}`}>{trip.destination}</div>
                                    <div className="text-[#FFFFFF]/60 text-xs mt-0.5">{formattedDate}</div>
                                  </div>
                                );
                              })}
                              {/* 未成行愿望 */}
                              {unconfirmedWishes.map(wish => {
                                const wishMonthNum = monthNameToNum[wish.travel_month] || parseInt(wish.travel_month);
                                const formattedDate = `${wish.travel_year}-${String(wishMonthNum).padStart(2, '0')}`;

                                return (
                                  <div
                                    key={wish.id}
                                    onClick={() => handleUnconfirmedWishClick(wish.id)}
                                    className="text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-none text-center cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gray-500/5    hover:bg-gray-500/10"
                                  >
                                    <div className="font-semibold truncate text-xs text-gray-400">{wish.destination}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">{formattedDate}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                  
                  {/* 手机端：已确认旅行和未成行愿望列表 */}
                  <div className="sm:hidden mt-3.5 space-y-2">
                    {wishes.filter(w => w.is_confirmed === 1 && w.confirmed_date && new Date(w.confirmed_date).getFullYear() === selectedYear)
                      .sort((a, b) => new Date(a.confirmed_date!).getTime() - new Date(b.confirmed_date!).getTime())
                      .map(trip => {
                        // 格式化日期为YYYY-MM
                        const dateStr = trip.confirmed_date || '';
                        const formattedDate = extractYYYYMMFromDate(dateStr);
                        const isExpired = trip.is_expired === 1;

                        return (
                          <div
                            key={trip.id}
                            onClick={() => navigateToPlan(trip.id)}
                            className={`flex items-center justify-between text-sm px-3 py-2.5 rounded-none cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                              isExpired
                                ? 'text-[#FFFFFF]/60 bg-gray-500/20 hover:bg-gray-500/30'
                                : 'text-[#FFFFFF] bg-[#CEA472]/20 hover:bg-[#CEA472]/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-semibold truncate ${isExpired ? 'text-gray-400' : 'text-[#CEA472]'}`}>{trip.destination}</span>
                            </div>
                            <span className="text-[#FFFFFF]/60 text-xs flex-shrink-0 ml-2">{formattedDate}</span>
                          </div>
                        );
                      })}
                    {/* 未成行愿望 */}
                    {wishes.filter(w => w.is_confirmed !== 1 && w.travel_year === selectedYear)
                      .sort((a, b) => {
                        const aMonthNum = monthNameToNum[a.travel_month] || parseInt(a.travel_month);
                        const bMonthNum = monthNameToNum[b.travel_month] || parseInt(b.travel_month);
                        return (a.travel_year * 12 + aMonthNum) - (b.travel_year * 12 + bMonthNum);
                      })
                      .map(wish => {
                        const wishMonthNum = monthNameToNum[wish.travel_month] || parseInt(wish.travel_month);
                        const formattedDate = `${wish.travel_year}-${String(wishMonthNum).padStart(2, '0')}`;

                        return (
                          <div
                            key={wish.id}
                            onClick={() => handleUnconfirmedWishClick(wish.id)}
                            className="flex items-center justify-between text-sm px-3 py-2.5 rounded-none cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gray-500/5    hover:bg-gray-500/10"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold truncate text-gray-400">{wish.destination}</span>
                            </div>
                            <span className="text-gray-500 text-xs flex-shrink-0 ml-2">{formattedDate}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

          {/* 子标签页（首屏之下，进入视口后再入场） */}
          <Tabs value={activeTab} onValueChange={(v) => wishTabTransition.switchTo(v, () => setActiveTab(v))} className="w-full reveal">
            <TabsList className="grid w-full grid-cols-2 gap-0.5 h-[48px] sm:h-[44px] bg-black/60 backdrop-blur-md rounded-none p-0">
              <TabsTrigger
                value="make-wish"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] text-xs h-full flex items-center justify-center"
              >
                抛硬币
              </TabsTrigger>
              <TabsTrigger
                value="wish-pool"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#CEA472] text-white/80 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] text-xs h-full flex items-center justify-center"
              >
                许愿池
              </TabsTrigger>
            </TabsList>

            <div className="relative">
              <div className={wishTabTransition.contentClassName} style={{ opacity: wishTabTransition.contentOpacity }}>
            {/* Make Wish Tab */}
            <TabsContent value="make-wish" className="min-h-[400px]">
              <div className="reveal reveal-group space-y-4.5 sm:space-y-6">
              <Card className="bg-black/60 backdrop-blur-sm">
                <CardContent className="space-y-4.5 pt-3.5 sm:pt-6 px-3.5 sm:px-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="destination" className="flex items-center gap-2 text-[#FFFFFF] text-xs">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472]" />
                      目的地
                    </Label>
                    <Input
                      id="destination"
                      placeholder="例如：巴黎、东京、马尔代夫..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="h-10 sm:h-11 bg-black/60  text-[#FFFFFF] placeholder:text-[#FFFFFF]/40  text-xs"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="travel-year-month" className="flex items-center gap-2 text-[#FFFFFF] text-xs">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472]" />
                      希望出行年月
                    </Label>
                    <Input
                      id="travel-year-month"
                      type="text"
                      placeholder="YYYY-MM（如：2026-03）"
                      value={travelYearMonth}
                      onChange={(e) => setTravelYearMonth(e.target.value)}
                      className="h-10 sm:h-11 bg-black/60  text-[#FFFFFF] placeholder:text-[#FFFFFF]/40  text-xs"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-[#FFFFFF] text-xs">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CEA472]" />
                      许愿人姓名
                    </Label>
                    <Input
                      id="name"
                      placeholder="请输入您的姓名"
                      value={wisherName}
                      onChange={(e) => setWisherName(e.target.value)}
                      className="h-10 sm:h-11 bg-black/60  text-[#FFFFFF] placeholder:text-[#FFFFFF]/40  text-xs"
                      disabled={isAnimating}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* 抛硬币按钮 - 独立于毛玻璃框外，与生成日程表按钮样式相同 */}
              <Button
                onClick={handleMakeWish}
                disabled={isAnimating}
                className="w-full -mt-2.5 sm:-mt-4 h-10 sm:h-11 bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 disabled:opacity-100 disabled:bg-[#CEA472] disabled:text-[#0a0a0f] text-xs"
              >
                {isAnimating ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative w-5 h-5 sm:w-6 sm:h-6">
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
                        <div className="text-sm font-bold text-[#CEA472] animate-bounce">✨ 抛硬币成功 ✨</div>
                        <p className="text-xs text-[#FFFFFF]/80">你的愿望已经飘向许愿池...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-[#CEA472]">正在抛硬币...</p>
                        <p className="text-xs text-[#FFFFFF]/60">闭上眼睛，许下心愿</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Wish Pool Tab */}
            <TabsContent value="wish-pool" className="space-y-5 min-h-[400px]">
              <h2 className="sr-only">许愿池</h2>
              <Card className="reveal bg-black/60 backdrop-blur-sm">
                <CardContent className="pt-5 sm:pt-6 px-2.5 sm:px-6">
                  {loading ? (
                    <div className="space-y-3" aria-busy="true" aria-label="加载中">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="p-3.5 sm:p-6 space-y-2.5">
                          <div className="skeleton-shimmer h-4 w-2/5" />
                          <div className="skeleton-shimmer h-3.5 w-3/5" />
                          <div className="skeleton-shimmer h-3.5 w-1/3" />
                        </div>
                      ))}
                    </div>
                  ) : wishes.length === 0 ? (
                    <div className="text-center py-12">
                      <Droplets className="w-16 h-16 text-[#CEA472]/50 mx-auto mb-4" />
                      <p className="text-sm text-[#FFFFFF]/60">许愿池还是空的</p>
                      <p className="text-[#FFFFFF]/40 mt-2">成为第一个许愿的人吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wishes.map((wish, index) => (
                        <div
                          key={wish.id}
                          onClick={() => wish.is_confirmed === 1 && !wish.is_expired && navigateToPlan(wish.id)}
                          className={`group overflow-hidden p-3.5 sm:p-6 rounded-none border-0 backdrop-blur-sm transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            wish.is_expired === 1
                              ? ' bg-gray-500/5'
                              : wish.is_confirmed === 1
                                ? ' bg-[#CEA472]/10 cursor-pointer hover:bg-[#CEA472]/15'
                                : ' bg-black/40  hover:bg-black/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1.5 mb-2 flex-wrap">
                                <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#CEA472] mt-0.5 flex-shrink-0" />
                                <h3 className="text-xs font-bold text-[#FFFFFF] truncate">
                                  {wish.destination}
                                </h3>
                                {wish.is_expired === 1 ? (
                                  <span className="px-1.5 py-0.5 text-xs bg-gray-500/50 text-gray-300 rounded-none font-semibold flex-shrink-0">
                                    已过期
                                  </span>
                                ) : wish.is_confirmed === 1 && (
                                  <span className="px-1.5 py-0.5 text-xs bg-[#CEA472] text-[#0a0a0f] rounded-none font-semibold flex-shrink-0">
                                    已成行
                                  </span>
                                )}
                              </div>
                              
                              {/* 已成行显示具体信息 */}
                              {wish.is_confirmed === 1 ? (
                                <div className="space-y-1.5 pl-4.5 sm:pl-6 text-[#FFFFFF]/80 mb-2.5">
                                  <div className="flex items-center gap-1">
                                    <Calendar className={`w-3 h-3 sm:w-4 sm:h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'} flex-shrink-0`} />
                                    <span className="text-xs truncate">{wish.confirmed_date || ''}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className={`w-3 h-3 sm:w-4 sm:h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'} flex-shrink-0`} />
                                    <span className="text-xs truncate">{wish.travelers}</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-1.5 pl-4.5 sm:pl-6 text-[#FFFFFF]/80 mb-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#CEA472] flex-shrink-0" />
                                      <span className="text-xs truncate">{formatDateToYYYYMM(wish.travel_year, months.indexOf(wish.travel_month) + 1)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-[#CEA472] flex-shrink-0" />
                                      <span className="text-xs truncate">{wish.wisher_name}</span>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* 跟随人信息 - 所有愿望都显示 */}
                              <div className={`text-xs pl-4.5 sm:pl-6 ${wish.is_expired === 1 ? 'text-gray-400/50' : 'text-[#FFFFFF]/50'}`}>
                                {wish.followers.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                      <span className={`text-xs ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`}>{wish.followers.length} 人跟随：</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 overflow-hidden">
                                      {wish.followers.map((name, idx) => (
                                        <div key={idx} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-none ${wish.is_expired === 1 ? 'bg-gray-500/20 ' : 'bg-black/60  '}`}>
                                          <span className={`text-xs truncate max-w-[60px] sm:max-w-none ${wish.is_expired === 1 ? 'text-gray-400/80' : 'text-[#FFFFFF]/80'}`}>{name}</span>
                                          {isAdminMode && (
                                            <button
                                              onClick={() => handleOpenDeleteFollowerDialog(wish.id, name)}
                                              className="text-red-500 hover:text-red-500 hover:bg-red-500/10 transition-colors p-0.5 rounded-none flex-shrink-0"
                                              title="删除跟随者"
                                            >
                                              <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${wish.is_expired === 1 ? 'text-gray-400' : 'text-[#CEA472]'}`} />
                                    <span className={`text-xs ${wish.is_expired === 1 ? 'text-gray-400/50' : 'text-[#FFFFFF]/50'}`}>暂无跟随</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* 非管理模式：只显示跟随按钮（已过期不允许跟随） */}
                              {!isAdminMode && wish.is_expired !== 1 && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenFollowDialog(wish.id);
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  title="跟随"
                                  className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent min-h-[36px]"
                                >
                                  <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              )}
                              {/* 管理模式：显示编辑、确定成行、删除按钮 */}
                              {isAdminMode && (
                                <>
                                  {wish.is_confirmed === 1 ? (
                                    // 已成行：显示编辑行程按钮和取消成行按钮
                                    <>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 获取该愿望的旅行天数
                                          fetch(`/api/trip-plans?wishId=${wish.id}`)
                                            .then(res => res.json())
                                            .then(data => {
                                              const travelDays = data.tripPlans && data.tripPlans.length > 0 
                                                ? data.tripPlans[0].travelDays 
                                                : 3;
                                              handleOpenTripInfoEdit({
                                                id: String(wish.id),
                                                confirmed_date: wish.confirmed_date,
                                                travelDays: travelDays,
                                                travelers: wish.travelers,
                                                destination: wish.destination,
                                              });
                                            });
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        title="编辑行程"
                                        className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent min-h-[36px]"
                                      >
                                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                      {/* 已过期行程显示冻结/解冻按钮 */}
                                      {wish.is_expired === 1 && (
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFreezeTrip(String(wish.id));
                                          }}
                                          variant="ghost"
                                          size="icon"
                                          title={tripFrozenStatus[String(wish.id)] ? '解冻行程' : '冻结行程'}
                                          className={
                                            tripFrozenStatus[String(wish.id)]
                                              ? 'text-blue-400 hover:text-blue-400 hover:bg-transparent min-h-[36px]'
                                              : 'text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent min-h-[36px]'
                                          }
                                        >
                                          <Snowflake className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </Button>
                                      )}
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenCancelConfirmDialog(String(wish.id));
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        title="取消成行"
                                        className="text-red-500 hover:text-red-500 hover:bg-transparent min-h-[36px]"
                                      >
                                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    // 未成行：显示编辑和确定成行按钮
                                    <>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditDialog(wish);
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        title="编辑"
                                        className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent min-h-[36px]"
                                      >
                                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenConfirmDialog(String(wish.id));
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        title="确定成行"
                                        className="text-[#CEA472] hover:text-[#CEA472] hover:bg-transparent min-h-[36px]"
                                      >
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDeleteDialog(wish.id);
                                    }}
                                    variant="ghost"
                                    size="icon"
                                    title="删除"
                                    className="text-red-500 hover:text-red-500 hover:bg-transparent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
              </div>
              {wishTabTransition.isLoading && <TabSwitchSkeleton />}
            </div>
          </Tabs>
        </div>
      );
    } else if (mainTab === 'plan') {
      return (
        <TripPlanner
          confirmedWishes={sortedConfirmedWishes}
          selectedDay={planDay}
          onSelectedDayChange={setPlanDay}
        />
      );
    } else if (mainTab === 'account') {
      return (
        <TripAccounting
          confirmedWishes={sortedConfirmedWishes}
          isAdminMode={isAdminMode}
          subTab={accountSub}
          onSubTabChange={setAccountSub}
          filters={accountFilters}
          onFiltersChange={setAccountFilters}
        />
      );
    } else if (mainTab === 'drive') {
      return (
        <TripDriving
          confirmedWishes={sortedConfirmedWishes}
          isAdminMode={isAdminMode}
          subTab={driveSub}
          onSubTabChange={setDriveSub}
        />
      );
    }
    return null;
  };

  // 旅行工具头部展示的当前行程
  const confirmedWishesNewestFirst = [...wishes.filter(w => w.is_confirmed === 1)].sort((a, b) =>
    (b.confirmed_date || '').localeCompare(a.confirmed_date || '')
  );
  const activeToolWish = confirmedWishesNewestFirst.find(w => String(w.id) === selectedToolWishId) || confirmedWishesNewestFirst[0];
  const activeToolWishId = activeToolWish ? String(activeToolWish.id) : '';
  const activeTripFrozen = !!tripFrozenStatus[activeToolWishId];
  const activeTripDays = tripDays[activeToolWishId] || 3;

  return (
    <div className="min-h-screen w-full relative">
      <GlobalBackground />

      {/* 顶部导航：固定悬浮 + 毛玻璃（44px 高，正文用等高占位避免遮挡） */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-11 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-11 px-4 flex items-center">
          {/* 品牌图标（左） */}
          <div className="flex flex-1 items-center">
            <div role="img" aria-label="旅行工具箱" className="animate-hero-avatar flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center" style={{
              backgroundColor: '#CEA472',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              <Plane className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: '#0a0a0f' }} aria-hidden="true" />
            </div>
          </div>

          {/* 一级导航：旅行许愿 / 旅行工具（居中，仅文字） */}
          <nav aria-label="主导航" className="animate-hero-sub flex flex-1 items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                if (mainTab !== 'wish') {
                  mainTabTransition.switchTo('wish', () => setMainTab('wish'));
                }
              }}
              aria-current={mainTab === 'wish' ? 'page' : undefined}
              className={`flex h-11 min-h-[44px] items-center px-2 sm:px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                mainTab === 'wish' ? 'text-[#CEA472]' : 'text-white/80 hover:text-[#CEA472]'
              }`}
            >
              <span>旅行许愿</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (mainTab === 'wish') {
                  mainTabTransition.switchTo('plan', () => setMainTab('plan'));
                }
              }}
              aria-current={mainTab !== 'wish' ? 'page' : undefined}
              className={`flex h-11 min-h-[44px] items-center px-2 sm:px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                mainTab !== 'wish' ? 'text-[#CEA472]' : 'text-white/80 hover:text-[#CEA472]'
              }`}
            >
              <span>旅行工具</span>
            </button>
          </nav>

          {/* 右侧操作：分享图标 + 管理齿轮（点击输入密码打卡） */}
          <div className="animate-hero-sub flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <button
              onClick={handleShare}
              title="分享当前页面"
              aria-label="分享页面"
              className="hit-expand hit-expand-share p-2 text-[#FFFFFF]/40 hover:text-[#CEA472] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              {shareSuccess ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAdminMode) {
                  setIsAdminMode(false);
                } else {
                  setPasswordModalOpen(true);
                }
              }}
              title={isAdminMode ? '退出管理模式' : '管理登录'}
              aria-label="管理"
              className={`hit-expand hit-expand-icon p-2 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${isAdminMode ? 'text-[#CEA472]' : 'text-[#FFFFFF]/40 hover:text-[#CEA472]'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      {/* 固定导航占位：保证任何页面首屏内容都不被遮挡 */}
      <div aria-hidden="true" className="h-11" />

      <main>
        <h1 className="sr-only">旅行工具箱</h1>

      {/* 旅行项目栏：独立一栏，与上方导航分离 */}
      {mainTab !== 'wish' && (
        <div className="mt-3 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="border-b border-white/[0.08] bg-black/60 backdrop-blur-md py-2 px-3.5 sm:px-4">
              <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-[#FFFFFF] font-medium text-xs sm:text-sm truncate">
                    {activeToolWish ? activeToolWish.destination : '选择旅行'}
                  </h2>
                  {activeTripFrozen && (
                    <span className="flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 text-xs text-blue-400">
                      <Snowflake className="w-2.5 h-2.5" />
                      已冻结
                    </span>
                  )}
                </div>
                <p className="text-[#FFFFFF]/60 text-xs mt-0.5 break-words">
                  {activeToolWish?.confirmed_date ? `${activeToolWish.confirmed_date} · ` : ''}
                  {activeTripDays}天{activeToolWish?.travelers ? ` · ${activeToolWish.travelers}` : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {isAdminMode && activeToolWish && !activeTripFrozen && (
                  <button
                    type="button"
                    onClick={() => handleOpenTripInfoEdit({
                      id: activeToolWishId,
                      confirmed_date: activeToolWish.confirmed_date,
                      travelDays: activeTripDays,
                      travelers: activeToolWish.travelers,
                      destination: activeToolWish.destination,
                    })}
                    title="编辑行程信息"
                    aria-label="编辑行程信息"
                    className="hit-expand hit-expand-icon p-2 text-[#CEA472] hover:text-[#CEA472]/80 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setToolWishSelectorOpen(true)}
                  title="切换旅行"
                  aria-label="切换旅行"
                  className="hit-expand hit-expand-icon p-2 text-[#CEA472] hover:text-[#CEA472]/80 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* 二级导航栏：与旅行项目分离，与下方三级导航贴齐 */}
      {mainTab !== 'wish' && (
        <div className="px-3 sm:px-6 lg:px-8 mt-2 sm:mt-3">
          <div className="max-w-7xl mx-auto px-4">
            <ToolTabNav value={mainTab as ToolTab} onChange={handleToolTabChange} />
          </div>
        </div>
      )}

      {/* 内容区域：工具模式下顶部不留间距，使三级导航紧贴二级导航 */}
      <div className={`relative z-10 px-3 sm:px-6 lg:px-8 ${mainTab === 'wish' ? 'py-6' : 'pt-0 pb-6'}`}>
        {/* 主内容 */}
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="relative">
            <div className={mainTabTransition.contentClassName} style={{ opacity: mainTabTransition.contentOpacity }}>
              {renderMainContent()}
            </div>
            {mainTabTransition.isLoading && <TabSwitchSkeleton />}
          </div>
        </div>
      </div>
      </main>

      {/* 切换旅行（旅行工具共用） */}
      <Dialog open={toolWishSelectorOpen} onOpenChange={setToolWishSelectorOpen}>
        <DialogContent
          className="bg-[#0a0a0f]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // 行程列表异步渲染：onOpenAutoFocus 触发时当前项可能尚未挂载，做短重试，
            // 优先聚焦当前行程（aria-current=page），无当前项时退到第一个按钮。
            const tryFocus = (attempt: number) => {
              const list = document.getElementById('tool-wish-selector-list');
              const current = list?.querySelector('[aria-current="page"]') as HTMLElement | null;
              const first = list?.querySelector('button') as HTMLElement | null;
              if (current) { current.focus(); return; }
              if (first && attempt >= 6) { first.focus(); return; }
              if (attempt < 20) { window.setTimeout(() => tryFocus(attempt + 1), 50); }
            };
            tryFocus(0);
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (document.querySelector('button[aria-label="切换旅行"]') as HTMLElement | null)?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">选择旅行</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">切换旅行工具当前查看的行程</DialogDescription>
          </DialogHeader>
          <div id="tool-wish-selector-list" className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
            {confirmedWishesNewestFirst.map(wish => {
              const isSelected = String(wish.id) === selectedToolWishId;
              return (
                <button
                  key={wish.id}
                  type="button"
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => handleToolWishSelect(wish)}
                  className={`w-full p-3 text-left transition-colors ${
                    isSelected ? 'bg-[#CEA472]/10 text-[#CEA472]' : 'bg-black/60 text-[#FFFFFF] hover:bg-black/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{wish.destination}</div>
                      <div className="text-xs text-[#FFFFFF]/60 mt-0.5 truncate">
                        {wish.confirmed_date} · {wish.travelers}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
            {confirmedWishesNewestFirst.length === 0 && (
              <p className="py-6 text-center text-xs text-[#FFFFFF]/60">暂无已确认成行的愿望</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 密码对话框 */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent
          className="bg-[#0a0a0f]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById('admin-password')?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (document.querySelector('button[aria-label="管理"]') as HTMLElement | null)?.focus();
          }}
        >
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
              className="bg-black/60  text-[#FFFFFF]"
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
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">编辑愿望</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="edit-destination" className="text-[#FFFFFF]">目的地</Label>
            <Input
              id="edit-destination"
              value={editingWish?.destination || ''}
              onChange={(e) => editingWish && setEditingWish({ ...editingWish, destination: e.target.value })}
              className="bg-black/60  text-[#FFFFFF]"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year" className="text-[#FFFFFF]">期望年份</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={editingWish?.travel_year || ''}
                  onChange={(e) => editingWish && setEditingWish({ ...editingWish, travel_year: parseInt(e.target.value) })}
                  className="bg-black/60  text-[#FFFFFF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-month" className="text-[#FFFFFF]">期望月份</Label>
                <select
                  id="edit-month"
                  value={editingWish?.travel_month || ''}
                  onChange={(e) => editingWish && setEditingWish({ ...editingWish, travel_month: e.target.value })}
                  className="w-full h-11 rounded-none bg-black/60   text-[#FFFFFF] px-3"
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
              className="bg-black/60  text-[#FFFFFF]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingWish(null);
              }}
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">确认成行</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="confirm-date" className="text-[#FFFFFF]">出发日期</Label>
            <Input
              id="confirm-date"
              type="text"
              placeholder="YYYY-MM-DD"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value.replace(/\//g, '-'))}
              className="bg-black/60  text-[#FFFFFF]"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="confirm-travel-days" className="text-[#FFFFFF]">旅行天数</Label>
                <Input
                  id="confirm-travel-days"
                  type="number"
                  min="1"
                  max="30"
                  value={confirmTravelDays}
                  onChange={(e) => setConfirmTravelDays(e.target.value)}
                  className="bg-black/60  text-[#FFFFFF]"
                />
              </div>
              <div>
                <Label htmlFor="confirm-travelers" className="text-[#FFFFFF]">同行人员</Label>
                <Input
                  id="confirm-travelers"
                  value={confirmTravelers}
                  onChange={(e) => setConfirmTravelers(e.target.value)}
                  className="bg-black/60  text-[#FFFFFF]"
                  placeholder="例如：张三、李四、王五"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmModalOpen(false);
                setConfirmingWishId('');
                setConfirmDate('');
                setConfirmTravelers('');
                setConfirmTravelDays('3');
              }}
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

      {/* 取消成行确认对话框 */}
      <Dialog open={cancelConfirmModalOpen} onOpenChange={setCancelConfirmModalOpen}>
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">取消成行</DialogTitle>
            <DialogDescription className="text-[#FFFFFF]/60">确定要取消这个行程的成行状态吗？此操作会将行程退回为愿望状态。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelConfirmModalOpen(false);
                setCancelingWishId('');
              }}
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
            >
              取消
            </Button>
            <Button
              onClick={handleCancelConfirmWish}
              className="bg-red-500 text-white hover:bg-red-500/80"
            >
              确认取消成行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除对话框 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-[#0a0a0f]  ">
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
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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

      {/* 统一的旅行信息编辑对话框 */}
      <Dialog open={tripInfoEditModalOpen} onOpenChange={setTripInfoEditModalOpen}>
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF] text-base">编辑旅行信息</DialogTitle>
            {editingTripInfo?.destination && (
              <DialogDescription className="text-[#CEA472] text-xs">
                {editingTripInfo.destination}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="trip-info-date" className="text-[#FFFFFF] text-xs">出发日期</Label>
              <Input
                id="trip-info-date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={editingTripInfo?.confirmed_date || ''}
                onChange={(e) => setEditingTripInfo(prev => prev ? { ...prev, confirmed_date: e.target.value } : null)}
                className="bg-black/60   text-[#FFFFFF] mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="trip-info-days" className="text-[#FFFFFF] text-xs">旅行天数</Label>
              <Input
                id="trip-info-days"
                type="number"
                min="1"
                max="30"
                value={editingTripInfo?.travelDays || 3}
                onChange={(e) => setEditingTripInfo(prev => prev ? { ...prev, travelDays: parseInt(e.target.value) || 1 } : null)}
                className="bg-black/60   text-[#FFFFFF] mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="trip-info-travelers" className="text-[#FFFFFF] text-xs">同行人员</Label>
              <Input
                id="trip-info-travelers"
                value={editingTripInfo?.travelers || ''}
                onChange={(e) => setEditingTripInfo(prev => prev ? { ...prev, travelers: e.target.value } : null)}
                className="bg-black/60   text-[#FFFFFF] mt-1 text-xs"
                placeholder="例如：张三、李四、王五"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTripInfoEditModalOpen(false);
                setEditingTripInfo(null);
              }}
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10 text-xs"
            >
              取消
            </Button>
            <Button
              onClick={handleSaveTripInfo}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 text-xs"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑行程对话框 */}
      <Dialog open={editTripModalOpen} onOpenChange={setEditTripModalOpen}>
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF] text-base">编辑行程</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="edit-trip-date" className="text-[#FFFFFF] text-xs">出发日期</Label>
            <Input
              id="edit-trip-date"
              type="text"
              placeholder="YYYY-MM-DD"
              value={editingTrip?.confirmed_date || ''}
              onChange={(e) => editingTrip && setEditingTrip({ ...editingTrip, confirmed_date: e.target.value })}
              className="bg-black/60  text-[#FFFFFF] text-xs"
            />
            <Label htmlFor="edit-trip-travelers" className="text-[#FFFFFF] text-xs">同行人员</Label>
            <Input
              id="edit-trip-travelers"
              value={editingTrip?.travelers || ''}
              onChange={(e) => editingTrip && setEditingTrip({ ...editingTrip, travelers: e.target.value })}
              className="bg-black/60  text-[#FFFFFF] text-xs"
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
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10 text-xs"
            >
              取消
            </Button>
            <Button
              onClick={handleEditTrip}
              className="bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80 text-xs"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟随对话框 */}
      <Dialog open={followModalOpen} onOpenChange={setFollowModalOpen}>
        <DialogContent className="bg-[#0a0a0f]  ">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF]">跟随愿望</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="follower-name" className="text-[#FFFFFF]">您的姓名</Label>
            <Input
              id="follower-name"
              placeholder="请输入您的姓名"
              value={followerName}
              onChange={(e) => setFollowerName(e.target.value)}
              className="h-11 bg-black/60  text-[#FFFFFF] placeholder:text-[#FFFFFF]/40 "
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
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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
        <DialogContent className="bg-[#0a0a0f]  ">
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
              className="bg-black/60  text-[#FFFFFF] hover:bg-[#CEA472]/10"
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
