'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hero — full-bleed portrait. Subject on the right, name at face-level on desktop
 * (22vh from top), below center on mobile (52vh). Bold, minimal.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const keyLightRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // track mobile breakpoint for responsive text position
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // scroll-driven: focus pull + name parallax
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const section = sectionRef.current;
      const portrait = portraitRef.current;
      const name = nameRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const h = section.offsetHeight;
      const p = Math.max(0, Math.min(1, -rect.top / h));

      // focus pull: portrait defocuses as we leave the hero
      if (portrait) {
        const blur = p * 8;
        const scale = 1 + p * 0.08;
        const ty = p * 80;
        portrait.style.filter = `saturate(0.82) blur(${blur}px) brightness(${0.94 - p * 0.25}) contrast(${1.05 - p * 0.1})`;
        portrait.style.transform = `translate3d(0, ${ty * 0.4}px, 0) scale(${scale})`;
      }

      // name parallax: drifts up faster
      if (name) {
        name.style.transform = `translate3d(0, ${-p * 120}px, 0)`;
        name.style.opacity = String(1 - p * 0.6);
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
      aria-label="Dhivakaran M — opening"
    >
      {/* portrait layer — subject on the right.
          Responsive <picture> with AVIF → WebP → JPEG fallback.
          4 width variants (400/800/1280/1920) match viewport via sizes="100vw".
          fetchPriority=high + decoding=async + loading=eager → LCP discovered
          before CSS parse (also preloaded in <head>). All existing filter /
          transform / will-change / transition behavior preserved on wrapper. */}
      <div
        ref={portraitRef}
        data-hero-portrait=""
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          filter: 'saturate(0.82) contrast(1.05) brightness(0.94)',
          transformOrigin: '60% 60%',
          transition: 'transform 0.95s var(--ease-reveal), filter 0.95s var(--ease-reveal)',
          willChange: 'transform, filter',
        }}
      >
        <picture>
          <source type="image/avif" srcSet="/images/landing-400.avif 400w, /images/landing-800.avif 800w, /images/landing-1280.avif 1280w, /images/landing-1920.avif 1920w" sizes="100vw" />
          <source type="image/webp" srcSet="/images/landing-400.webp 400w, /images/landing-800.webp 800w, /images/landing-1280.webp 1280w, /images/landing-1920.webp 1920w" sizes="100vw" />
          <img
            src="/images/landing-fallback.jpg"
            alt="Dhivakaran M — opening portrait"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
            loading="eager"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '75% 25%',
            }}
          />
        </picture>
      </div>

      {/* darkening gradient for text legibility on the left */}
      <div
        data-hero-backdrop=""
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(10, 10, 10, 0.55) 0%, rgba(10, 10, 10, 0.15) 35%, transparent 55%, rgba(10, 10, 10, 0.2) 100%)',
          transformOrigin: '66% 100%',
          transition: 'transform 0.95s var(--ease-reveal)',
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

      {/* copy block — at face level on desktop (22vh), below center on mobile (52vh) */}
      <div
        ref={nameRef}
        className="canvas-max"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingTop: isMobile ? '52vh' : '0',
          justifyContent: isMobile ? 'flex-start' : 'center',
          alignItems: isMobile ? 'flex-start' : 'center',
        }}
      >
        {/* name — bold */}
        <h1
          data-hero-3d=""
          style={{
            color: 'var(--canvas)',
            margin: 0,
            lineHeight: 0.88,
            maxWidth: '14ch',
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 700,
            fontSize: 'clamp(3.5rem, 12vw, 12rem)',
            letterSpacing: '-0.03em',
            transition: 'transform 0.95s var(--ease-reveal) 0.14s, opacity 0.7s var(--ease-opacity) 0.14s',
            textShadow: '0 2px 40px rgba(10, 10, 10, 0.6)',
            textAlign: isMobile ? 'left' : 'center',
          }}
        >
          Dhivakaran{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 700, color: 'var(--accent-soft)' }}>M</em>
        </h1>

        {/* subline — humble */}
        <p
          data-hero-3d-lines=""
          className="text-body-lg"
          style={{
            color: 'var(--canvas)',
            opacity: 0.8,
            marginBlock: '1.5rem 0 0',
            textAlign: isMobile ? 'left' : 'center',
            marginInline: isMobile ? '0' : 'auto',
          }}
        >
          Brands, products &amp; the art in between.
          <br />
          A designer working from the heart.
        </p>
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
