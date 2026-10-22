'use client';

import { useEffect } from 'react';

/**
 * #14 Scroll-velocity motion blur.
 * Tracks scroll velocity; when scrolling fast, sets body[data-scroll-fast="true"]
 * which applies a 2px blur. Snaps back to sharp within 200ms of stopping.
 * Disabled on reduced-motion.
 */
export function useScrollVelocity(threshold = 40, resetMs = 180) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let resetTimer: ReturnType<typeof setTimeout>;
    let rafPending = false;

    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const now = performance.now();
        const dy = Math.abs(window.scrollY - lastY);
        const dt = Math.max(1, now - lastT);
        const v = dy / dt * 16; // px per frame (~16ms)
        lastY = window.scrollY;
        lastT = now;

        if (v > threshold) {
          document.body.setAttribute('data-scroll-fast', 'true');
        }
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          document.body.removeAttribute('data-scroll-fast');
        }, resetMs);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(resetTimer);
      document.body.removeAttribute('data-scroll-fast');
    };
  }, [threshold, resetMs]);
}
