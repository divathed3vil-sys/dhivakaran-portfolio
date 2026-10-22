'use client';

import { useEffect, useRef } from 'react';

/**
 * #21 Viewfinder cursor — camera viewfinder (aspect frame + crosshairs + frame counter).
 * Replaces the cursor INSIDE the Visual Lab overlay only. Disabled on touch + reduced-motion.
 */
export function ViewfinderCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const vf = ref.current;
    if (!vf) return;

    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;
      vf.style.transform = `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
    };

    document.body.setAttribute('data-vf-active', 'true');
    document.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
      document.body.removeAttribute('data-vf-active');
    };
  }, []);

  return (
    <div className="viewfinder" ref={ref} aria-hidden="true">
      <span className="vf-label">VF · 180×120 · F2.8</span>
    </div>
  );
}
