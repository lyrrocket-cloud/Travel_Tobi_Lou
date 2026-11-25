'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type TabPhase = 'idle' | 'leaving' | 'loading' | 'entering';

/**
 * 受控 Tab 切换过渡：旧内容淡出 → 骨架加载 → 新内容淡入
 *
 * 用法：
 *   const tt = useTabTransition();
 *   <Tabs value={tab} onValueChange={(v) => tt.switchTo(v, () => setTab(v))}>
 *   内容容器：
 *     <div className="relative">
 *       <div className={tt.contentClassName} style={{ opacity: tt.contentOpacity }}>
 *         {content}
 *       </div>
 *       {tt.isLoading && <TabSwitchSkeleton />}
 *     </div>
 *
 * 原理：onValueChange 时不立即提交受控值，先淡出旧内容并展示骨架，
 * 延迟后再 commit 真正切换，随后恢复不透明实现淡入。
 */
export function useTabTransition(options?: { leaveMs?: number; loadMs?: number }) {
  const leaveMs = options?.leaveMs ?? 180;
  const loadMs = options?.loadMs ?? 260;
  const [phase, setPhase] = useState<TabPhase>('idle');
  // 是否已经发生过真实切换：用于只在切换后挂载进入动画，首屏与普通输入更新不重放
  const [hasSwitched, setHasSwitched] = useState(false);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const switchTo = useCallback(
    (next: string, commit: () => void) => {
      if (busy.current) return; // 过渡期间忽略重复点击，避免状态错乱
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        commit();
        return;
      }
      busy.current = true;
      clear();
      setPhase('leaving');
      timers.current.push(window.setTimeout(() => setPhase('loading'), leaveMs));
      timers.current.push(
        window.setTimeout(() => {
          commit(); // 真正切换受控值，挂载新内容
          setHasSwitched(true);
          setPhase('entering');
          timers.current.push(
            window.setTimeout(() => {
              setPhase('idle');
              busy.current = false;
            }, 40),
          );
        }, leaveMs + loadMs),
      );
    },
    [leaveMs, loadMs],
  );

  useEffect(() => clear, []);

  const contentOpacity = phase === 'idle' ? 1 : 0;
  const contentClassName =
    hasSwitched && phase !== 'leaving' && phase !== 'loading'
      ? 'tab-section-in'
      : 'tab-section-out';
  return { phase, switchTo, contentOpacity, contentClassName, isLoading: phase === 'loading' };
}

/** Tab 切换骨架屏（覆盖在内容区，配合内容淡出使用） */
export function TabSwitchSkeleton() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col gap-3 p-1" aria-hidden="true">
      <div className="skeleton-shimmer h-5 w-1/3" />
      <div className="skeleton-shimmer h-24 w-full" />
      <div className="skeleton-shimmer h-4 w-2/3" />
      <div className="skeleton-shimmer h-4 w-1/2" />
    </div>
  );
}
