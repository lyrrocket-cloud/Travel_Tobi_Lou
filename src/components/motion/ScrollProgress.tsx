'use client';

import { useEffect, useState } from 'react';

/**
 * 顶部滚动进度条（L0 常驻氛围）
 * 读取真实 window 滚动，Lenis 驱动下同样生效
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="scroll-progress-bar"
      style={{ width: '100%', transform: `scaleX(${progress})` }}
      aria-hidden="true"
    />
  );
}
