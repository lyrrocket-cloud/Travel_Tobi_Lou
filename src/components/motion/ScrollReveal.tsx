'use client';

import { useEffect } from 'react';

/**
 * 滚动 reveal：为所有带 .reveal 的元素在进入视口时添加 .is-visible
 * - 首次挂载全量观察，DOM 变更后自动补观察新节点
 * - prefers-reduced-motion 时直接显示（CSS 也会兜底）
 */
export function ScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const revealAll = () => {
      document
        .querySelectorAll('.reveal')
        .forEach((el) => el.classList.add('is-visible'));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealAll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    const observeAll = () => {
      document
        .querySelectorAll('.reveal:not(.is-visible)')
        .forEach((el) => io.observe(el));
    };
    observeAll();

    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
