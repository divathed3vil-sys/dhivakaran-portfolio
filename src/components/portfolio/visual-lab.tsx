'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BokehField } from './bokeh-field';
import { ViewfinderCursor } from './viewfinder-cursor';

const SOURCES = [
  '/images/portrait.png',
  '/images/atmosphere.png',
  '/images/object-lens.png',
];

const FILTERS = [
  'grayscale(1) contrast(1.08) brightness(0.95)',
  'grayscale(1) contrast(1.15) brightness(0.82)',
  'grayscale(1) contrast(1.2) brightness(0.72)',
  'grayscale(1) contrast(1.05) brightness(0.86)',
  'grayscale(1) contrast(1.25) brightness(0.78)',
  'grayscale(1) contrast(0.95) brightness(0.88)',
];

const BG_POSITIONS = [
  '50% 30%',
  '20% 50%',
  '80% 50%',
  '50% 80%',
  '30% 20%',
  '70% 70%',
  '50% 50%',
  '10% 90%',
];

/**
 * Visual Lab — full-screen OVERLAY with infinite drag/pan field + depth-of-field.
 *
 * Entered via the VisualLabCard on the home page. This is a separate
 * experience (fixed overlay, body scroll locked). Closes via the X button,
 * the EXIT pill, or Esc — so the user is never trapped.
 *
 * Inventions:
 *  - Full-bleed overlay (covers entire viewport, minimal chrome)
 *  - Iris-open entrance (clip-path circle 0 → 150%)
 *  - Toroidal wrap: drag/scroll in any direction infinitely
 *  - Depth-of-field: tiles near viewport center = sharp, edges = blurred
 *  - Grunge per tile: grayscale film filter, slight rotation, dust overlay
 *  - Inertia on release (vx,vy * 0.95 per frame)
 *  - Wheel pans infinitely (the overlay is fixed, so wheel = pan, never scroll)
 *  - Arrow keys pan
 *  - Hint fades after first input
 *  - Close (X top-right) + EXIT pill + Esc — multiple ways out
 */
export function VisualLab({ onClose }: { onClose: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const pan = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    active: false, // whether lab is centered (and capturing wheel)
  });

  const [hintGone, setHintGone] = useState(false);

  // generate tile set — dense enough that toroidal wrap fills the viewport
  const { tiles, fieldW, fieldH } = useMemo(() => {
    const cols = 8;
    const rows = 7;
    const cellW = 290;
    const cellH = 290;
    const arr: Tile[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const sizeJitter = 0.92 + ((idx * 13) % 16) / 100;
        arr.push({
          lx: c * cellW + (((idx * 37) % 20) - 10),
          ly: r * cellH + (((idx * 53) % 20) - 10),
          w: 280 * sizeJitter,
          h: 280 * sizeJitter * (0.92 + ((idx * 7) % 12) / 100),
          src: SOURCES[idx % SOURCES.length],
          bgPos: BG_POSITIONS[idx % BG_POSITIONS.length],
          filter: FILTERS[idx % FILTERS.length],
          rot: ((idx * 17) % 100) / 100 * 4 - 2,
          key: idx,
        });
      }
    }
    return { tiles: arr, fieldW: cols * cellW, fieldH: rows * cellH };
  }, []);

  // initial pan — center the field in the viewport so the depth-of-field
  // has sharp tiles in the middle on first paint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pan.current.x = -(fieldW / 2 - vw / 2);
    pan.current.y = -(fieldH / 2 - vh / 2);
    pan.current.active = true; // overlay is always in view when mounted
  }, [fieldW, fieldH]);

  // Esc to close + body scroll lock while overlay open + iris entrance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // rAF loop — toroidal wrap + depth-of-field + inertia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const field = fieldRef.current;
    if (!field) return;
    const tileEls = Array.from(
      field.querySelectorAll<HTMLElement>('[data-tile]')
    );

    let rafId = 0;

    const update = () => {
      rafId = 0;

      // inertia
      if (!pan.current.dragging) {
        if (
          Math.abs(pan.current.vx) > 0.08 ||
          Math.abs(pan.current.vy) > 0.08
        ) {
          pan.current.x += pan.current.vx;
          pan.current.y += pan.current.vy;
          pan.current.vx *= 0.95;
          pan.current.vy *= 0.95;
        } else {
          pan.current.vx = 0;
          pan.current.vy = 0;
        }
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = vw / 2;
      const cy = vh / 2;

      for (const tile of tileEls) {
        const lx = parseFloat(tile.dataset.lx || '0');
        const ly = parseFloat(tile.dataset.ly || '0');
        const tw = parseFloat(tile.dataset.w || '0');
        const th = parseFloat(tile.dataset.h || '0');
        const trot = parseFloat(tile.dataset.rot || '0');

        let sx = (((lx + pan.current.x) % fieldW) + fieldW) % fieldW;
        let sy = (((ly + pan.current.y) % fieldH) + fieldH) % fieldH;
        if (sx > vw + 400) sx -= fieldW;
        if (sy > vh + 400) sy -= fieldH;

        // depth of field — distance from viewport center
        const tcx = sx + tw / 2;
        const tcy = sy + th / 2;
        const dist = Math.hypot(tcx - cx, tcy - cy);
        const r = Math.min(1, dist / 680);
        const l = r * r * (3 - 2 * r); // smoothstep
        const scale = 1.08 - 0.16 * l;
        const blur = l * 9;
        const rot = trot + l * 2.5 * (tcx > cx ? -1 : 1);
        const opacity = 0.55 + 0.45 * (1 - l);

        tile.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${scale}) rotate(${rot}deg)`;
        tile.style.filter = `${tile.dataset.filter || ''} blur(${blur}px)`;
        tile.style.opacity = String(opacity);
      }

      // counter
      if (counterRef.current) {
        const total = Math.abs(Math.round(pan.current.x + pan.current.y));
        counterRef.current.textContent = String(total % 10000).padStart(4, '0');
      }

      if (
        !pan.current.dragging &&
        (Math.abs(pan.current.vx) > 0.08 ||
          Math.abs(pan.current.vy) > 0.08)
      ) {
        rafId = requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    // pointer drag
    const section = sectionRef.current;
    if (!section) return;

    const onPointerDown = (e: PointerEvent) => {
      // ignore right-click / non-primary
      if (e.button !== 0) return;
      pan.current.dragging = true;
      pan.current.lastX = e.clientX;
      pan.current.lastY = e.clientY;
      pan.current.vx = 0;
      pan.current.vy = 0;
      section.setPointerCapture(e.pointerId);
      section.style.cursor = 'grabbing';
      dismissHint();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pan.current.dragging) return;
      const dx = e.clientX - pan.current.lastX;
      const dy = e.clientY - pan.current.lastY;
      pan.current.x += dx;
      pan.current.y += dy;
      pan.current.vx = dx;
      pan.current.vy = dy;
      pan.current.lastX = e.clientX;
      pan.current.lastY = e.clientY;
      schedule();
    };
    const onPointerUp = (e: PointerEvent) => {
      pan.current.dragging = false;
      try {
        section.releasePointerCapture(e.pointerId);
      } catch {}
      section.style.cursor = 'grab';
      schedule();
    };

    // wheel — overlay is fixed, so wheel ALWAYS pans (never scrolls)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pan.current.x -= e.deltaX;
      pan.current.y -= e.deltaY;
      // small inertia contribution
      pan.current.vx = -e.deltaX * 0.3;
      pan.current.vy = -e.deltaY * 0.3;
      dismissHint();
      schedule();
    };

    // arrow keys — always pan while overlay open
    const onKey = (e: KeyboardEvent) => {
      const step = 60;
      let handled = true;
      if (e.key === 'ArrowRight') pan.current.x += step;
      else if (e.key === 'ArrowLeft') pan.current.x -= step;
      else if (e.key === 'ArrowDown') pan.current.y += step;
      else if (e.key === 'ArrowUp') pan.current.y -= step;
      else handled = false;
      if (handled) {
        e.preventDefault();
        dismissHint();
        schedule();
      }
    };

    const dismissHint = () => {
      if (hintGone) return;
      setHintGone(true);
    };

    section.addEventListener('pointerdown', onPointerDown);
    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerup', onPointerUp);
    section.addEventListener('pointercancel', onPointerUp);
    section.addEventListener('wheel', onWheel, { passive: false });
    // NOTE: Escape is handled by the overlay-level effect, not here

    // initial paint
    schedule();
    // continuous rAF for the depth-of-field (it depends on viewport center,
    // which doesn't change unless we pan — but we want the inertia to keep going)
    let continuousRaf = 0;
    const loop = () => {
      continuousRaf = requestAnimationFrame(loop);
      // only update if there's inertia OR dragging
      if (
        pan.current.dragging ||
        Math.abs(pan.current.vx) > 0.08 ||
        Math.abs(pan.current.vy) > 0.08
      ) {
        if (!rafId) rafId = requestAnimationFrame(update);
      }
    };
    continuousRaf = requestAnimationFrame(loop);

    return () => {
      section.removeEventListener('pointerdown', onPointerDown);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerup', onPointerUp);
      section.removeEventListener('pointercancel', onPointerUp);
      section.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(continuousRaf);
    };
  }, [fieldW, fieldH, hintGone]);

  return (
    <section
      id="visual-lab"
      ref={sectionRef}
      data-canvas="fixed"
      data-lenis-prevent=""
      aria-label="Visual Lab — infinite drag field"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--night)',
        cursor: 'grab',
        touchAction: 'none',
        animation: 'iris-open 0.7s var(--ease-curtain) both',
      }}
    >
      {/* field of tiles */}
      <div ref={fieldRef} style={{ position: 'absolute', inset: 0 }}>
        {tiles.map((t) => (
          <div
            key={t.key}
            data-tile=""
            data-lx={t.lx}
            data-ly={t.ly}
            data-w={t.w}
            data-h={t.h}
            data-rot={t.rot}
            data-filter={t.filter}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${t.w}px`,
              height: `${t.h}px`,
              backgroundImage: `url(${t.src})`,
              backgroundSize: 'cover',
              backgroundPosition: t.bgPos,
              willChange: 'transform, filter, opacity',
              boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* dust + scratch overlay per tile — grunge */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'/></filter><rect width='100%25' height='100%25' filter='url(%23d)'/></svg>\")",
                backgroundSize: '100px 100px',
                mixBlendMode: 'overlay',
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            />
            {/* frame border — like a contact sheet frame */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                border: '8px solid var(--canvas)',
                boxShadow: 'inset 0 0 0 1px rgba(11, 10, 8, 0.3)',
                pointerEvents: 'none',
                opacity: 0.85,
              }}
            />
          </div>
        ))}
      </div>

      <ViewfinderCursor />

      <BokehField count={6} />

      {/* vignette + grain — cinematic depth */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(10, 10, 10, 0.85) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>\")",
          backgroundSize: '200px 200px',
          opacity: 0.12,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* top-left label — minimal chrome */}
      <div
        className="leader-track text-label"
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          color: 'var(--canvas)',
          opacity: 0.8,
          zIndex: 5,
          lineHeight: 1.6,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '20px', height: '1.5px', background: 'var(--accent)' }} />
          THE VISUAL LAB
        </div>
        <div style={{ opacity: 0.7, marginTop: '0.25rem' }}>
          0049 frames · one plane
        </div>
        <div style={{ opacity: 0.5, marginTop: '0.15rem' }}>
          OFFSET <span ref={counterRef}>0000</span>
        </div>
      </div>

      {/* CLOSE button — top-right, red border accent */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close the Visual Lab"
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 7,
          width: '44px',
          height: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid var(--accent)',
          color: 'var(--canvas)',
          background: 'rgba(10, 10, 10, 0.6)',
          backdropFilter: 'blur(6px)',
          cursor: 'pointer',
          transition: 'background 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent)';
          e.currentTarget.style.color = 'var(--canvas)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(10, 10, 10, 0.6)';
          e.currentTarget.style.color = 'var(--canvas)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* hint — only visible until first input */}
      <div
        ref={hintRef}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--canvas)',
          opacity: hintGone ? 0 : 0.6,
          transition: 'opacity 0.7s var(--ease-out-soft)',
          zIndex: 5,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          className="text-label"
          style={{ color: 'var(--canvas)', letterSpacing: '0.2em' }}
        >
          ✦ DRAG · SCROLL · ARROW KEYS — TO EXPLORE ✦
        </div>
      </div>

      {/* EXIT pill — closes the overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit the Visual Lab"
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.65rem 1.1rem',
          border: '1.5px solid var(--accent)',
          color: 'var(--canvas)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          background: 'rgba(10, 10, 10, 0.6)',
          backdropFilter: 'blur(6px)',
          cursor: 'pointer',
          transition: 'background 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(10, 10, 10, 0.6)';
        }}
      >
        ✕ EXIT LAB
      </button>
    </section>
  );
}

type Tile = {
  lx: number;
  ly: number;
  w: number;
  h: number;
  src: string;
  bgPos: string;
  filter: string;
  rot: number;
  key: number;
};
