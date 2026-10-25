'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LAB_IMAGE_SRCS } from './lib/portfolio-images';
import { getLabImageUrls } from '@/lib/supabase-data';
import { lowResUrl } from './lib/use-portfolio-data';

// Sources: empty by default — the Visual Lab fetches lab image URLs from Supabase on open
const SOURCES = LAB_IMAGE_SRCS;

const BG_POSITIONS = ['50% 30%', '20% 50%', '80% 50%', '50% 80%', '30% 20%', '70% 70%', '50% 50%', '10% 90%'];

/**
 * Visual Lab — OPTIMIZED full-screen infinite drag field.
 *
 * Performance fixes:
 *  - Low-res WebP tiles (2-15KB vs 100KB+ PNGs)
 *  - NO per-tile filter:blur (was the #1 cost — 24 software blur filters)
 *  - NO per-tile dust overlay, NO global grain overlay, NO bokeh motes
 *  - NO viewfinder cursor (removed the big frame + its rAF loop)
 *  - "Reveal" de-blur via ONE backdrop-filter overlay with a cursor-follow mask
 *    (flashlight: sharp at cursor, blurred elsewhere — GPU-accelerated, single element)
 *  - Toroidal wrap fixed: round(center-based) instead of ceil (fixes black gaps)
 *  - rAF only runs during drag/inertia (not continuous)
 *
 * The "Exit The Lab" button closes the overlay + scrolls to top (instant).
 */
export function VisualLab({ onClose }: { onClose: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const pan = useRef({ x: 0, y: 0, vx: 0, vy: 0, dragging: false, lastX: 0, lastY: 0 });
  const [hintGone, setHintGone] = useState(false);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [dbLabUrls, setDbLabUrls] = useState<string[] | null>(null);
  const [closing, setClosing] = useState(false);

  // fetch lab image URLs from Supabase (falls back to hardcoded if empty)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls = await getLabImageUrls();
      if (!cancelled) setDbLabUrls(urls);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Responsive tile grid — uniform 280px tiles (cellW = tileW = 280, touching)
  const { tiles, fieldW, fieldH } = useMemo(() => {
    const cellW = 280;
    const cellH = 280;
    const cols = Math.max(3, Math.ceil(viewport.w / cellW) + 1);
    const rows = Math.max(3, Math.ceil(viewport.h / cellH) + 1);
    const arr = [];
    const sources = (dbLabUrls && dbLabUrls.length > 0) ? dbLabUrls.map(u => lowResUrl(u, 400)) : SOURCES;
    if (sources.length === 0) return { tiles: arr, fieldW: 1, fieldH: 1 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        arr.push({
          lx: c * cellW + (((idx * 53) % 30) - 15),
          ly: r * cellH + (((idx * 71) % 30) - 15),
          w: 280,
          h: 280,
          src: sources[idx % sources.length],
          bgPos: BG_POSITIONS[idx % BG_POSITIONS.length],
          rot: ((idx * 37) % 100) / 100 * 6 - 3,
          key: idx,
        });
      }
    }
    return { tiles: arr, fieldW: cols * cellW, fieldH: rows * cellH };
  }, [viewport.w, viewport.h, dbLabUrls]);

  // initial pan — center the field
  useEffect(() => {
    if (typeof window === 'undefined') return;
    pan.current.x = -(fieldW / 2 - window.innerWidth / 2);
    pan.current.y = -(fieldH / 2 - window.innerHeight / 2);
  }, [fieldW, fieldH]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // rAF loop — toroidal wrap (center-based, fixes black gaps) + inertia.
  // Only runs during drag/inertia (not continuous).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const field = fieldRef.current;
    const section = sectionRef.current;
    if (!field || !section) return;
    const tileEls = Array.from(field.querySelectorAll<HTMLElement>('[data-tile]'));
    let rafId = 0;

    const update = () => {
      rafId = 0;
      // inertia
      if (!pan.current.dragging) {
        if (Math.abs(pan.current.vx) > 0.08 || Math.abs(pan.current.vy) > 0.08) {
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

        // toroidal wrap — center-based (round, not ceil) fixes black gaps at edges
        let sx = (((lx + pan.current.x) % fieldW) + fieldW) % fieldW;
        let sy = (((ly + pan.current.y) % fieldH) + fieldH) % fieldH;
        sx += Math.round((cx - sx) / fieldW) * fieldW;
        sy += Math.round((cy - sy) / fieldH) * fieldH;

        // subtle scale + opacity by distance (NO blur — much cheaper)
        const dist = Math.hypot(sx + tw / 2 - cx, sy + th / 2 - cy);
        const r = Math.min(1, dist / 700);
        const scale = 1 - 0.06 * r;
        const opacity = 0.6 + 0.4 * (1 - r);

        tile.style.transform = `translate3d(${sx}px, ${sy}px, 0) rotate(${trot}deg) scale(${scale})`;
        tile.style.opacity = String(opacity);
      }

      if (counterRef.current) {
        const total = Math.abs(Math.round(pan.current.x + pan.current.y));
        counterRef.current.textContent = String(total % 10000).padStart(4, '0');
      }

      if (
        !pan.current.dragging &&
        (Math.abs(pan.current.vx) > 0.08 || Math.abs(pan.current.vy) > 0.08)
      ) {
        rafId = requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    // pointer drag
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pan.current.dragging = true;
      pan.current.lastX = e.clientX;
      pan.current.lastY = e.clientY;
      pan.current.vx = 0;
      pan.current.vy = 0;
      section.setPointerCapture(e.pointerId);
      section.style.cursor = 'grabbing';
      if (!hintGone) setHintGone(true);
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
      try { section.releasePointerCapture(e.pointerId); } catch {}
      section.style.cursor = 'grab';
      schedule();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pan.current.x -= e.deltaX;
      pan.current.y -= e.deltaY;
      pan.current.vx = -e.deltaX * 0.3;
      pan.current.vy = -e.deltaY * 0.3;
      if (!hintGone) setHintGone(true);
      schedule();
    };
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
        if (!hintGone) setHintGone(true);
        schedule();
      }
    };

    section.addEventListener('pointerdown', onPointerDown);
    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerup', onPointerUp);
    section.addEventListener('pointercancel', onPointerUp);
    section.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    schedule();

    return () => {
      section.removeEventListener('pointerdown', onPointerDown);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerup', onPointerUp);
      section.removeEventListener('pointercancel', onPointerUp);
      section.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafId);
    };
  }, [fieldW, fieldH, hintGone]);

  // cursor-follow "reveal" overlay — backdrop-filter blur with a transparent circle
  // at the cursor (sharp) + opaque elsewhere (blurred). The "flashlight" de-blur.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const reveal = revealRef.current;
    if (!reveal) return;
    let rafId = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          reveal.style.setProperty('--rx', `${x}px`);
          reveal.style.setProperty('--ry', `${y}px`);
        });
      }
    };
    reveal.style.setProperty('--rx', `${x}px`);
    reveal.style.setProperty('--ry', `${y}px`);
    sectionRef.current?.addEventListener('mousemove', onMove);
    return () => {
      sectionRef.current?.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="visual-lab"
      ref={sectionRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visual Lab"
      onDoubleClick={() => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 700);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        background: 'var(--night)',
        cursor: 'grab',
        touchAction: 'none',
        animation: closing ? 'iris-close 0.7s var(--ease-curtain) both' : 'iris-open 0.7s var(--ease-curtain) both',
      }}
    >
      {/* tiles — low-res WebP/AVIF via real <img>, NO per-tile filters (just transforms + opacity).
          loading=lazy + decoding=async so offscreen tiles don't block first paint. */}
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
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${t.w}px`,
              height: `${t.h}px`,
              backgroundColor: 'var(--night)',
              willChange: 'transform, opacity',
              border: '0',
              boxShadow: '0 8px 20px -6px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            <img
              src={t.src}
              alt=""
              loading="lazy"
              decoding="async"
              width={400}
              height={400}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      {/* "reveal" overlay — backdrop blur with cursor-follow transparent circle.
          Sharp at the cursor, blurred elsewhere. Single element, GPU-accelerated. */}
      <div
        ref={revealRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 5,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          maskImage:
            'radial-gradient(circle 480px at var(--rx, 50%) var(--ry, 50%), transparent 0%, transparent 55%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(circle 480px at var(--rx, 50%) var(--ry, 50%), transparent 0%, transparent 55%, black 100%)',
        }}
      />

      {/* subtle vignette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 10, 10, 0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* top-left label */}
      <div
        className="leader-track text-label"
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          color: 'var(--canvas)',
          opacity: 0.8,
          zIndex: 6,
          lineHeight: 1.6,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '20px', height: '1.5px', background: 'var(--accent)' }} />
          THE VISUAL LAB
        </div>
        <div style={{ opacity: 0.5, marginTop: '0.25rem' }}>
          OFFSET <span ref={counterRef}>0000</span>
        </div>
      </div>

      {/* hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--canvas)',
          opacity: hintGone ? 0 : 0.6,
          transition: 'opacity 0.7s var(--ease-out-soft)',
          zIndex: 6,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div className="text-label" style={{ color: 'var(--canvas)', letterSpacing: '0.2em' }}>
          DRAG · SCROLL · ARROW KEYS — TO EXPLORE
        </div>
      </div>

      {/* double-click to exit instruction — center bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 7,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div className="text-label" style={{ color: 'var(--canvas)', opacity: 0.5, letterSpacing: '0.15em' }}>
          double-click anywhere to exit
        </div>
      </div>
    </section>
  );
}
