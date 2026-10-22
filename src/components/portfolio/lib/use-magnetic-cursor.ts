'use client';

import { useEffect, useRef } from 'react';

/**
 * #18 Magnetic cursor.
 * - A soft red trailing glow follows the cursor (no custom dot).
 * - Interactive elements (a, button, [role="button"]) attract the cursor within 80px.
 * Disabled on touch + reduced-motion.
 */
export function useMagneticCursor() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const glow = glowRef.current;
    if (!glow) return;

    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let magnetic = false;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      // magnetic attraction to interactive elements
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const interactive = el?.closest('a, button, [role="button"], [data-magnetic]');
      if (interactive) {
        const r = interactive.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const range = 80;
        if (dist < range) {
          const pull = (1 - dist / range) * 0.4; // 0..0.4
          targetX = e.clientX + (cx - e.clientX) * pull;
          targetY = e.clientY + (cy - e.clientY) * pull;
          magnetic = true;
        } else {
          magnetic = false;
        }
      } else {
        magnetic = false;
      }
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      // lerp toward target
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      glow.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%) scale(${magnetic ? 2.2 : 1})`;
      glow.style.opacity = magnetic ? '1' : '0.7';
    };

    document.body.setAttribute('data-cursor-ready', '');
    document.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
      document.body.removeAttribute('data-cursor-ready');
    };
  }, []);

  return glowRef;
}
