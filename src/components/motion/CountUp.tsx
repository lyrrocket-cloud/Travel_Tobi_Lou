'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 数字滚动 count-up
 * - 进入视口（top 88%）时从 0 滚动到目标值，只播放一次
 */
export function CountUp({
  value,
  duration = 1.6,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = value.toLocaleString();
      return;
    }

    const obj = { v: 0 };
    el.textContent = '0';

    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString();
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString()}
    </span>
  );
}
