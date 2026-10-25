'use client';

import { useEffect, useRef } from 'react';

/**
 * Phase 5b — Apple-style magnetic cursor (dot + ring + soft glow halo).
 *
 *  - .cursor-dot — small solid dot, tracks cursor 1:1 (no lag)
 *  - .cursor-ring — larger ring, spring-follows cursor (lerp 0.15)
 *  - .magnetic-glow — soft red halo, slower follow (lerp 0.08)
 *
 * On hover over interactive elements (a, button, [role="button"], [data-magnetic]):
 *  - body gets [data-cursor-hover] attribute
 *  - CSS enlarges the ring + intensifies the glow (transition via spring easing)
 *  - Ring also magnetically pulls toward the element center within 80px range
 *
 * Disabled on touch + reduced-motion (CSS handles the display:none).
 */
export function useMagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const glow = glowRef.current;
    if (!dot || !ring || !glow) return;

    let rafId = 0;
    // Target position (cursor)
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    // Ring follow (lerp 0.15 — spring-like)
    let ringX = targetX;
    let ringY = targetY;
    // Glow follow (lerp 0.08 — slower, more ethereal)
    let glowX = targetX;
    let glowY = targetY;
    // Magnetic pull target offset (when hovering interactive elements)
    let magOffsetX = 0;
    let magOffsetY = 0;
    let isHovering = false;

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
          const pull = (1 - dist / range) * 0.35; // 0..0.35
          magOffsetX = (cx - e.clientX) * pull;
          magOffsetY = (cy - e.clientY) * pull;
          if (!isHovering) {
            isHovering = true;
            document.body.setAttribute('data-cursor-hover', '');
          }
        } else {
          magOffsetX = 0;
          magOffsetY = 0;
          if (isHovering) {
            isHovering = false;
            document.body.removeAttribute('data-cursor-hover');
          }
        }
      } else {
        magOffsetX = 0;
        magOffsetY = 0;
        if (isHovering) {
          isHovering = false;
          document.body.removeAttribute('data-cursor-hover');
        }
      }
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      // Dot: 1:1 with cursor (no lag)
      dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
      // Ring: spring-follow with magnetic pull (lerp 0.15)
      ringX += (targetX + magOffsetX - ringX) * 0.15;
      ringY += (targetY + magOffsetY - ringY) * 0.15;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      // Glow: slower follow (lerp 0.08) — creates a trailing halo
      glowX += (targetX + magOffsetX - glowX) * 0.08;
      glowY += (targetY + magOffsetY - glowY) * 0.08;
      glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
    };

    document.body.setAttribute('data-cursor-ready', '');
    document.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
      document.body.removeAttribute('data-cursor-ready');
      document.body.removeAttribute('data-cursor-hover');
    };
  }, []);

  // Return the glowRef for backward compat (EffectsProvider mounts it)
  // — but EffectsProvider now mounts all 3 elements via separate refs.
  // We expose the refs via a single object for the provider to spread.
  return { dotRef, ringRef, glowRef };
}
