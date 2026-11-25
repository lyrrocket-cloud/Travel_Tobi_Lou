'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

/**
 * 全局背景层：雪山图片 + 双层渐变遮罩 + 三组漂移光斑 + 鼠标聚光。
 * 与主站 GlobalBackground 保持一致的结构与参数：
 * - fixed 容器不参与滚动，避免移动端 background-attachment 行为差异
 * - 统一 -z-10 + pointer-events-none，不遮挡正文、不拦截点击
 */
export function GlobalBackground() {
  const cursorRef = useRef<HTMLDivElement>(null);

  // 鼠标聚光 —— requestAnimationFrame + 低延迟 ref 更新
  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    // 减少动态效果：不启动 RAF，聚光保持隐藏
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.display = 'none';
      return;
    }

    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const onLeave = () => {
      el.style.opacity = '0';
    };
    const onEnter = () => {
      el.style.opacity = '1';
    };

    const tick = () => {
      // 缓动，避免光点抖动
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.setProperty('--cx', `${currentX}px`);
      el.style.setProperty('--cy', `${currentY}px`);
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <Image
        src="/matterhorn-bg.jpg"
        alt=""
        fill
        quality={90}
        priority
        className="object-cover"
      />
      {/* 垂直渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
      {/* 水平渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

      {/* 背景光斑 —— 缓慢漂移，营造舞台打光感 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-blob-a" />
        <div className="bg-blob-b" />
        <div className="bg-blob-c" />
      </div>

      {/* 鼠标聚光 */}
      <div
        ref={cursorRef}
        className="cursor-glow"
        style={{
          background:
            'radial-gradient(400px circle at var(--cx, 50%) var(--cy, 50%), rgba(206,164,114,0.09), rgba(206,164,114,0.03) 30%, transparent 60%)',
        }}
      />
    </div>
  );
}
