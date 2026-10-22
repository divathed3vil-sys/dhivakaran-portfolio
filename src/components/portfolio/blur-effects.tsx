'use client';

import { useEffect, useRef } from 'react';

/**
 * BlurEffects — the full blur system, rebuilt per user request.
 *
 * Three very-subtle backdrop-filter overlays (NOT body filter, which would
 * break position:fixed on nav/glow/viewfinder):
 *
 *  1. SCROLL BLUR (0.4px) — only while the page is moving. Fades to 0 in
 *     ~150ms when scroll stops, so there's NO blur at all when still.
 *  2. EDGE VIGNETTE BLUR (0.6px) — permanent, only at the very outer edges
 *     (transparent 72% inward via radial mask). Cinematic vignette.
 *  3. RANDOM FLICKER (0.35px) — very often, very random, very low. Every
 *     1–2.5s, applies a brief 300–600ms blur. Like a film camera's focus
 *     occasionally drifting and returning.
 *
 * Scroll + flicker share one overlay (toggled by opacity). Edge is a
 * separate permanent overlay.
 *
 * Off on reduced-motion.
 */
export function BlurEffects() {
  const scrollFlickerRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const flickerRef = useRef(false);

  const apply = () => {
    const el = scrollFlickerRef.current;
    if (!el) return;
    const active = scrollingRef.current || flickerRef.current;
    el.style.opacity = active ? '1' : '0';
  };

  // 1. SCROLL BLUR — only while scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      scrollingRef.current = true;
      apply();
      clearTimeout(t);
      t = setTimeout(() => {
        scrollingRef.current = false;
        apply();
      }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t);
      scrollingRef.current = false;
    };
  }, []);

  // 3. RANDOM FLICKER — very often, very random, very low
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let delayT: ReturnType<typeof setTimeout>;
    let durT: ReturnType<typeof setTimeout>;

    const schedule = () => {
      // very often: 1s - 2.5s between flickers
      const delay = 1000 + Math.random() * 1500;
      delayT = setTimeout(() => {
        flickerRef.current = true;
        apply();
        // very brief: 300-600ms
        const duration = 300 + Math.random() * 300;
        durT = setTimeout(() => {
          flickerRef.current = false;
          apply();
          schedule();
        }, duration);
      }, delay);
    };
    schedule();

    return () => {
      clearTimeout(delayT);
      clearTimeout(durT);
      flickerRef.current = false;
    };
  }, []);

  return (
    <>
      {/* SCROLL + FLICKER overlay — shared, opacity-toggled */}
      <div
        ref={scrollFlickerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9989,
          backdropFilter: 'blur(0.4px)',
          WebkitBackdropFilter: 'blur(0.4px)',
          opacity: 0,
          transition: 'opacity 0.15s linear',
          willChange: 'opacity',
        }}
      />

      {/* EDGE VIGNETTE BLUR — permanent, very subtle, very edge only */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9988,
          backdropFilter: 'blur(0.6px)',
          WebkitBackdropFilter: 'blur(0.6px)',
          // transparent 72% inward (no blur in center), opaque at extreme edges
          maskImage:
            'radial-gradient(ellipse 92% 92% at center, transparent 72%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 92% 92% at center, transparent 72%, black 100%)',
        }}
      />
    </>
  );
}
