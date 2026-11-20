'use client';

import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * 路由切换过渡
 * 使用独立全屏遮罩淡出（视觉上的 fade-in），而不是对整页内容做 opacity 动画。
 * 避免与页面元素入场动画叠加，也避免容器成为 fixed 的包含块。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {children}
      <div className="page-fade-overlay" aria-hidden="true" />
    </>
  );
}
