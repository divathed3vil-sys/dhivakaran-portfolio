'use client';

import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver-based reveal. Sets data-reveal "waiting" → "shown"
 * when the element enters. Optional stagger delay in ms.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  delay = 0,
  rootMargin = '0 0 -12% 0'
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute('data-reveal', 'waiting');
    if (delay) el.style.transitionDelay = `${delay}ms`;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-reveal', 'shown');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.setAttribute('data-reveal', 'shown');
            io.unobserve(el);
          }
        });
      },
      { rootMargin, threshold: 0.05 }
    );
    io.observe(el);

    return () => io.disconnect();
  }, [delay, rootMargin]);

  return ref;
}
