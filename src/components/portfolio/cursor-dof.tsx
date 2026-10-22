'use client';

import { useEffect, useRef } from 'react';

/**
 * CursorDOF — cursor-following depth-of-field.
 * A subtle constant backdrop blur over the page, with a clear circle (~300px)
 * around the cursor where there's NO blur. Like looking through fogged glass
 * with a clear spot you can move.
 *
 * This replaces the scroll-velocity blur (which randomly blurred all content
 * during fast scroll — "conflicting"). This is constant + predictable + clears
 * exactly where the user is looking.
 *
 * Off on touch + reduced-motion (no cursor / no motion).
 */
export function CursorDOF() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          el.style.setProperty('--cx', `${targetX}px`);
          el.style.setProperty('--cy', `${targetY}px`);
        });
      }
    };

    // initialize to center
    el.style.setProperty('--cx', `${targetX}px`);
    el.style.setProperty('--cy', `${targetY}px`);

    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9991,
        backdropFilter: 'blur(1.5px)',
        WebkitBackdropFilter: 'blur(1.5px)',
        willChange: 'backdrop-filter',
        // radial mask: transparent (no blur) at cursor, black (blur) elsewhere
        // clear circle ~210px radius, transition to 300px
        maskImage:
          'radial-gradient(circle 300px at var(--cx, 50%) var(--cy, 50%), transparent 0%, transparent 65%, black 100%)',
        WebkitMaskImage:
          'radial-gradient(circle 300px at var(--cx, 50%) var(--cy, 50%), transparent 0%, transparent 65%, black 100%)',
      }}
    />
  );
}
