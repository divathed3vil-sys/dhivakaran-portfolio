'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SOURCES = [
  '/images/portrait.png',
  '/images/atmosphere.png',
  '/images/object-lens.png',
];

const FILTERS = [
  'sepia(0.2) contrast(1.05) brightness(0.92)',
  'sepia(0.4) contrast(1.12) brightness(0.82) hue-rotate(-8deg)',
  'sepia(0.55) contrast(1.18) brightness(0.74) hue-rotate(12deg)',
  'grayscale(0.5) sepia(0.3) contrast(1.08) brightness(0.86)',
  'sepia(0.15) contrast(1.22) brightness(0.8) hue-rotate(-4deg)',
  'sepia(0.3) contrast(1.0) brightness(0.88)',
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
 * Visual Lab — full-screen infinite drag/pan field with depth-of-field.
 *
 * Inventions:
 *  - Full-bleed (covers entire viewport, minimal chrome)
 *  - Toroidal wrap: drag/scroll in any direction infinitely
 *  - Depth-of-field: tiles near viewport center = sharp, edges = blurred
 *    (camera-lens distortion — the user's "getting focus and out of focus")
 *  - Grunge per tile: random warm filter, slight rotation, dust overlay
 *  - Inertia on release (vx,vy * 0.95 per frame)
 *  - Wheel pans infinitely (preventDefault while lab is centered)
 *  - Arrow keys pan
 *  - Hint fades after first input
 *  - "EXIT ↓" pill — the only way to leave (scroll = pan, not exit)
 */
export function VisualLab() {
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
    const cellW = 340;
    const cellH = 340;
    const arr: Tile[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const sizeJitter = 0.78 + ((idx * 13) % 40) / 100;
        arr.push({
          lx: c * cellW + (((idx * 37) % 60) - 30),
          ly: r * cellH + (((idx * 53) % 60) - 30),
          w: 260 * sizeJitter,
          h: 260 * sizeJitter * (0.88 + ((idx * 7) % 24) / 100),
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
  }, [fieldW, fieldH]);

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

    // wheel — pan instead of scroll (only when lab is centered)
    const onWheel = (e: WheelEvent) => {
      if (!pan.current.active) return;
      e.preventDefault();
      pan.current.x -= e.deltaX;
      pan.current.y -= e.deltaY;
      // small inertia contribution
      pan.current.vx = -e.deltaX * 0.3;
      pan.current.vy = -e.deltaY * 0.3;
      dismissHint();
      schedule();
    };

    // arrow keys
    const onKey = (e: KeyboardEvent) => {
      if (!pan.current.active) return;
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

    // activate when lab is centered
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          pan.current.active = entry.intersectionRatio > 0.6;
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(section);

    section.addEventListener('pointerdown', onPointerDown);
    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerup', onPointerUp);
    section.addEventListener('pointercancel', onPointerUp);
    section.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);

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
      io.disconnect();
      section.removeEventListener('pointerdown', onPointerDown);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerup', onPointerUp);
      section.removeEventListener('pointercancel', onPointerUp);
      section.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
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
      style={{
        position: 'relative',
        height: '100dvh',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--night)',
        cursor: 'grab',
        touchAction: 'none',
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
              border: '1px solid rgba(184, 153, 104, 0.08)',
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

      {/* vignette + grain — cinematic depth */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(16, 14, 11, 0.85) 100%)',
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
          top: '5rem',
          left: '1.5rem',
          color: 'var(--brass-soft)',
          opacity: 0.85,
          zIndex: 5,
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '20px', height: '1.5px', background: 'var(--brass-soft)' }} />
          THE VISUAL LAB
        </div>
        <div style={{ opacity: 0.7, marginTop: '0.25rem' }}>
          0049 FRAMES · ONE PLANE · INFINITE
        </div>
        <div style={{ opacity: 0.5, marginTop: '0.15rem' }}>
          OFFSET <span ref={counterRef}>0000</span>
        </div>
      </div>

      {/* center title — only when hint is visible, very subtle */}
      <div
        ref={hintRef}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--canvas)',
          opacity: hintGone ? 0 : 0.7,
          transition: 'opacity 0.7s var(--ease-out-soft)',
          zIndex: 5,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          className="text-label"
          style={{ color: 'var(--brass-soft)', letterSpacing: '0.2em' }}
        >
          ✦ DRAG · SCROLL · ARROW KEYS — TO WANDER ✦
        </div>
      </div>

      {/* EXIT pill — the only way to leave */}
      <a
        href="#skillset"
        aria-label="Exit the Visual Lab and continue to Skillset"
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.65rem 1.1rem',
          border: '1.5px solid var(--brass)',
          color: 'var(--canvas)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          background: 'rgba(16, 14, 11, 0.6)',
          backdropFilter: 'blur(6px)',
          textDecoration: 'none',
          transition: 'background 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'var(--brass)';
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(16, 14, 11, 0.6)';
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--canvas)';
        }}
      >
        EXIT ↓ TO SKILLSET
      </a>
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
