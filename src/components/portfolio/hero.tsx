'use client';

import { useEffect, useRef } from 'react';

/**
 * Hero — full-bleed integrated portrait.
 * The portrait IS the page: full-bleed object-cover with a brass color-grade
 * and grain so it reads as canvas, not as a dropped photo.
 *
 * Inventions:
 *  - 3D rise reveal on load (driven by html[data-loading])
 *  - Focus pull on scroll: portrait defocuses as you leave the hero (camera pull)
 *  - Frame counter in the corner synced to scroll (film-camera feel)
 *  - Cursor-follow brass key light (soft radial)
 *  - Name parallaxes up faster than portrait (parallax depth)
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const keyLightRef = useRef<HTMLDivElement>(null);

  // scroll-driven: focus pull + parallax + frame counter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const section = sectionRef.current;
      const portrait = portraitRef.current;
      const name = nameRef.current;
      const counter = counterRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const h = section.offsetHeight;
      // progress 0 → 1 as hero scrolls out of view
      const p = Math.max(0, Math.min(1, -rect.top / h));

      // focus pull: blur 0 → 8px, scale 1 → 1.08 as we leave
      if (portrait) {
        const blur = p * 8;
        const scale = 1 + p * 0.08;
        const ty = p * 80; // portrait drifts down slightly
        portrait.style.filter = `grayscale(1) blur(${blur}px) brightness(${1 - p * 0.25}) contrast(${1.08 - p * 0.1})`;
        portrait.style.transform = `translate3d(0, ${ty * 0.4}px, 0) scale(${scale})`;
      }

      // name parallax: drifts up faster
      if (name) {
        name.style.transform = `translate3d(0, ${-p * 120}px, 0)`;
        name.style.opacity = String(1 - p * 0.6);
      }

      // frame counter: 0001 → 0024 as we leave the hero
      if (counter) {
        const frame = Math.round(p * 24);
        counter.textContent = String(frame).padStart(4, '0');
      }
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

  // cursor-follow key light
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const section = sectionRef.current;
    const light = keyLightRef.current;
    if (!section || !light) return;

    let rafId = 0;
    const onMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const rect = section.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        light.style.background = `radial-gradient(circle 320px at ${x}px ${y}px, rgba(255, 255, 255, 0.14), transparent 70%)`;
      });
    };

    section.addEventListener('mousemove', onMove);
    return () => section.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      data-canvas="home"
      style={{
        position: 'relative',
        height: '100dvh',
        minHeight: 'calc(680 * var(--px))',
        overflow: 'hidden',
        background: 'var(--night)',
      }}
      aria-label="Dhivakaran — opening"
    >
      {/* portrait layer — full-bleed, grayscale film treatment */}
      <div
        ref={portraitRef}
        data-hero-portrait=""
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/portrait.png)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 30%',
          filter: 'grayscale(1) contrast(1.08) brightness(0.92)',
          transformOrigin: '60% 60%',
          transition: 'transform 0.95s var(--ease-reveal), filter 0.95s var(--ease-reveal)',
          willChange: 'transform, filter',
        }}
      />

      {/* darkening gradient — for text legibility at the bottom */}
      <div
        data-hero-backdrop=""
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10, 10, 10, 0.35) 0%, rgba(10, 10, 10, 0.05) 35%, rgba(10, 10, 10, 0.15) 60%, rgba(10, 10, 10, 0.9) 100%)',
          transformOrigin: '66% 100%',
          transition: 'transform 0.95s var(--ease-reveal)',
          pointerEvents: 'none',
        }}
      />

      {/* subtle red accent tint — very faint, cinematic */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(214, 41, 41, 0.06) 0%, transparent 50%, rgba(10, 10, 10, 0.1) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* cursor-follow key light */}
      <div
        ref={keyLightRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          transition: 'background 0.18s linear',
        }}
      />

      {/* copy block */}
      <div
        ref={nameRef}
        className="canvas-max"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 'calc(54 * var(--px))',
        }}
      >
        {/* eyebrow */}
        <div
          data-hero-3d-lines=""
          className="text-label"
          style={{
            color: 'var(--accent-soft)',
            marginBottom: '1.5rem',
            transition: 'transform 0.95s var(--ease-reveal) 0.34s, opacity 0.7s var(--ease-opacity) 0.34s',
          }}
        >
          ( DESIGNER · BRAND · PRODUCT · ART DIRECTION )
        </div>

        {/* name */}
        <h1
          data-hero-3d=""
          className="text-display"
          style={{
            color: 'var(--canvas)',
            margin: 0,
            lineHeight: 0.88,
            maxWidth: '12ch',
            transition: 'transform 0.95s var(--ease-reveal) 0.14s, opacity 0.7s var(--ease-opacity) 0.14s',
            textShadow: '0 2px 40px rgba(16, 14, 11, 0.6)',
          }}
        >
          Dhivakaran
        </h1>

        {/* subline */}
        <p
          data-hero-3d-lines=""
          className="text-body-lg"
          style={{
            color: 'var(--night-body)',
            marginBlock: '1.5rem 0',
            maxWidth: '38ch',
            transition: 'transform 0.95s var(--ease-reveal) 0.52s, opacity 0.7s var(--ease-opacity) 0.52s',
          }}
        >
          Brands, products &amp; the art in between.
          <br />
          A designer working out of Colombo — scroll to expose the print.
        </p>
      </div>

      {/* frame counter — corner */}
      <div
        className="leader-track text-label"
        style={{
          position: 'absolute',
          top: '5rem',
          right: '1.5rem',
          color: 'var(--canvas)',
          opacity: 0.8,
          zIndex: 3,
          textAlign: 'right',
          lineHeight: 1.5,
        }}
      >
        <div>FRAME <span ref={counterRef}>0000</span> / 0024</div>
        <div style={{ opacity: 0.6, marginTop: '0.25rem' }}>DEVELOPING ROOM</div>
      </div>

      {/* scroll hint — bottom left */}
      <div
        className="text-label"
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1.5rem',
          color: 'var(--canvas)',
          opacity: 0.6,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ display: 'inline-block', width: '24px', height: '1.5px', background: 'var(--accent)' }} />
        SCROLL TO DEVELOP
      </div>

      {/* closing hairline — accent red */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '1.5px',
          background: 'var(--accent)',
          opacity: 0.5,
          zIndex: 4,
        }}
      />
    </section>
  );
}
