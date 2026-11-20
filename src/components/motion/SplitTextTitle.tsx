'use client';

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type ElementType,
} from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type SplitLine = {
  text: string;
  className?: string;
};

/**
 * 逐字 SplitText 标题入场
 * - 每行一个遮罩，字符从下方浮出 + 3D 翻转 + 去模糊
 * - 字符 stagger 0.045s
 *
 * 关键：行容器在 SSR 首帧就带 opacity: 0，避免 hydrate 前先露出完整文字；
 * SplitText 初始化后在同一帧内显示父级（此时字符仍处于 from 隐藏态）。
 */
export function SplitTextTitle({
  lines,
  className,
  as = 'h2',
}: {
  lines: SplitLine[];
  className?: string;
  as?: ElementType;
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const maskRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealMasks = () => {
      maskRefs.current.forEach((el) => {
        if (el) el.style.opacity = '1';
      });
    };

    // 尊重系统偏好：直接显示
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealMasks();
      return;
    }

    const splits: SplitText[] = [];
    const chars: Element[] = [];

    root.querySelectorAll<HTMLElement>('[data-split-line]').forEach((line) => {
      const split = new SplitText(line, {
        type: 'chars',
        charsClass: 'split-char',
      });
      splits.push(split);
      chars.push(...split.chars);
    });

    if (!chars.length) {
      revealMasks();
      return;
    }

    gsap.set(root, { perspective: 900 });

    // from() 同步写入隐藏态（immediateRender），随后再显示父级遮罩，
    // 此时页面上不会出现「完整文字」的过渡帧。
    const tween = gsap.from(chars, {
      yPercent: 115,
      opacity: 0,
      rotateX: -75,
      filter: 'blur(8px)',
      duration: 0.95,
      ease: 'power3.out',
      stagger: 0.045,
      delay: 0.1,
    });

    revealMasks();

    return () => {
      tween.kill();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return createElement(
    as,
    { ref: rootRef, className },
    <>
      <noscript>
        <style>{`.split-line-mask{opacity:1 !important}`}</style>
      </noscript>
      {lines.map((line, i) => (
        <span
          key={i}
          ref={(el) => {
            maskRefs.current[i] = el;
          }}
          className="split-line-mask block overflow-hidden"
          style={{ opacity: 0 }}
        >
          <span
            data-split-line
            className={`inline-block will-change-transform ${line.className ?? ''}`}
          >
            {line.text}
          </span>
        </span>
      ))}
    </>,
  );
}
