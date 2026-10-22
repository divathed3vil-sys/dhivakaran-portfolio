'use client';

import { useEffect, useRef } from 'react';

/**
 * #23 Developing-tray bloom.
 * Adds [data-bloomed] when the element enters the viewport (once).
 * The CSS in globals.css does the clip-path circle + blur + brightness bloom.
 *
 * Usage: attach the returned ref to the content block you want to bloom.
 */
export function useBloom<T extends HTMLElement = HTMLDivElement>(
  rootMargin = '0px 0px -10% 0px'
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute('data-bloom', '');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-bloomed', '');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.setAttribute('data-bloomed', '');
            io.unobserve(el);
          }
        });
      },
      { rootMargin, threshold: 0.1 }
    );
    io.observe(el);

    // safety: force-bloom after 1.5s so content is never stuck hidden
    const safety = setTimeout(() => {
      el.setAttribute('data-bloomed', '');
    }, 1500);

    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [rootMargin]);

  return ref;
}

/**
 * #24 Variable font weight on scroll (Fraunces 300→700).
 * The blur rack (#2) was REMOVED per user request — titles must stay sharp.
 * This hook now ONLY drives the variable font-weight; it explicitly sets
 * filter: none inline to guarantee no blur (defends against any cached CSS).
 */
export function useHeadingRack<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // explicitly kill any filter (defends against cached [data-rack] blur CSS)
    el.style.filter = 'none';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.fontWeight = '500';
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const innerH = window.innerHeight;
      // progress: 0 when heading at bottom of viewport, 1 when at top
      const p = 1 - (rect.top + rect.height / 2) / innerH;
      const clamped = Math.max(0, Math.min(1, p));

      // weight 300 → 700 across the viewport, peaking at center then settling
      // Use a bell curve: max weight at p=0.5
      const bell = Math.sin(clamped * Math.PI);
      const weight = Math.round(300 + bell * 400); // 300..700
      el.style.fontWeight = String(weight);
      // keep filter explicitly none on every update (no blur, ever)
      el.style.filter = 'none';
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return ref;
}
