'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hero — full-bleed portrait. Subject on the right, name at face-level on desktop
 * (22vh from top), below center on mobile (52vh). Bold, minimal.
 *
 * Phase 5b.2 — Apple-like spring-stagger reveal on "Dhivakaran M" h1 (per-letter
 * spans with --ease-spring-medium, 35ms stagger delay, fires after IntroLoader
 * removes data-loading). Portrait gets parallax-with-resistance on cursor
 * (subtle 12px/8px max offset, lerp 0.08 spring-follow, composited with the
 * existing scroll-driven transform).
 */

// Phase 5b.2 — split "Dhivakaran M" into per-letter spans for the spring stagger.
// "Dhivakaran" + non-breaking space + italic "M" — each letter gets its own
// <span class="hero-letter"> with a --i CSS variable for staggered delay.
function renderNameWithStagger() {
  const word = 'Dhivakaran';
  const letters: React.ReactNode[] = [];
  // Letters of "Dhivakaran" — each gets a spring-stagger reveal via CSS
  word.split('').forEach((ch, i) => {
    letters.push(
      <span key={`l${i}`} className="hero-letter" style={{ ['--i' as string]: i } as React.CSSProperties}>
        {ch}
      </span>
    );
  });
  // Non-breaking space (so it doesn't collapse) — also a hero-letter so it staggers
  letters.push(
    <span key="sp" className="hero-letter" style={{ ['--i' as string]: word.length } as React.CSSProperties}>
      &nbsp;
    </span>
  );
  // Italic "M" — wrapped in <em> + the letter is a hero-letter too
  letters.push(
    <em
      key="M"
      style={{ fontStyle: 'italic', fontWeight: 700, color: 'var(--accent-soft)' }}
    >
      <span className="hero-letter" style={{ ['--i' as string]: word.length + 1 } as React.CSSProperties}>
        M
      </span>
    </em>
  );
  return letters;
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const sharpLayerRef = useRef<HTMLPictureElement>(null);
  const blurLayerRef = useRef<HTMLPictureElement>(null);
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

  // scroll-driven: focus pull (cross-fade) + name parallax + Phase 5b.2 portrait parallax-with-resistance.
  // Phase 3 — replaced per-frame filter:blur(0→8px) on a 1920px element with an
  // opacity cross-fade between sharp <picture> (opacity 1→0) and pre-rendered
  // blurred <picture> (opacity 0→1). Per brief §2.4: pre-rendering a stable blur
  // is output-preserving when the underlying scene is static (the Hero image IS
  // static — no moving content behind the blur). The brightness/contrast
  // animations remain (they're point operations on a single composited layer —
  // cheap per-frame, no convolution).
  //
  // Phase 5b.2 — uses a continuous rAF loop (every frame) so the portrait
  // parallax-with-resistance can lerp toward the cursor target even when the
  // user stops moving the mouse. Cost is negligible (~0.1ms per frame on a
  // single transform update). Respects reduced-motion (returns early).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let rafId = 0;
    // Parallax target (cursor position, normalized to -1..1 from section center)
    const parallaxTarget = { x: 0, y: 0 };
    // Parallax applied (lerp toward target for spring-follow feel)
    const parallaxApplied = { x: 0, y: 0 };

    const update = () => {
      const section = sectionRef.current;
      const portrait = portraitRef.current;
      const sharpLayer = sharpLayerRef.current;
      const blurLayer = blurLayerRef.current;
      const name = nameRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const h = section.offsetHeight;
      const p = Math.max(0, Math.min(1, -rect.top / h));

      // focus pull via cross-fade: sharp fades out, pre-blurred fades in
      if (portrait) {
        const scale = 1 + p * 0.08;
        const ty = p * 80;
        // brightness/contrast remain (point ops, cheap). No more blur in filter.
        portrait.style.filter = `saturate(0.82) brightness(${0.94 - p * 0.25}) contrast(${1.05 - p * 0.1})`;
        // Phase 5b.2 — include parallax offset in the transform (composited with scroll-driven)
        // Lerp applied toward target (0.08 = subtle spring-follow, 0.92 = quick settle)
        parallaxApplied.x += (parallaxTarget.x - parallaxApplied.x) * 0.08;
        parallaxApplied.y += (parallaxTarget.y - parallaxApplied.y) * 0.08;
        const px = parallaxApplied.x;
        const py = parallaxApplied.y;
        portrait.style.transform = `translate3d(${px}px, ${ty * 0.4 + py}px, 0) scale(${scale})`;
      }
      if (sharpLayer) sharpLayer.style.opacity = String(1 - p);
      if (blurLayer) blurLayer.style.opacity = String(p);

      // name parallax: drifts up faster (slight parallax x drift too)
      if (name) {
        const nx = parallaxApplied.x * 0.4; // name drifts less than portrait
        const ny = parallaxApplied.y * 0.4;
        name.style.transform = `translate3d(${nx}px, ${-p * 120 + ny}px, 0)`;
        name.style.opacity = String(1 - p * 0.6);
      }
    };

    // Continuous rAF loop — runs every frame so parallax can lerp toward target
    // even when mouse stops moving. Cancelled on unmount.
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      update();
    };
    rafId = requestAnimationFrame(loop);

    // Phase 5b.2 — mouse-driven parallax target (only on hover-capable devices)
    const onMouseMove = (e: MouseEvent) => {
      if (!hasHover) return;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // Normalize to -1..1 from section center
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      // Max 12px / 8px offset (subtle — Apple-like resistance)
      parallaxTarget.x = nx * 12;
      parallaxTarget.y = ny * 8;
    };
    const onMouseLeave = () => {
      // Spring back to center when mouse leaves the hero
      parallaxTarget.x = 0;
      parallaxTarget.y = 0;
    };

    if (hasHover) {
      const section = sectionRef.current;
      if (section) {
        section.addEventListener('mousemove', onMouseMove, { passive: true });
        section.addEventListener('mouseleave', onMouseLeave);
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (hasHover) {
        const section = sectionRef.current;
        if (section) {
          section.removeEventListener('mousemove', onMouseMove);
          section.removeEventListener('mouseleave', onMouseLeave);
        }
      }
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
          Phase 3 — TWO stacked <picture> layers cross-faded by scroll:
            1. Sharp layer (LCP-critical, fetchPriority=high, preloaded in <head>)
            2. Pre-rendered blurred layer (tiny — 2.7 KB AVIF at 1920px, low priority)
          Scroll handler: sharp opacity 1→0, blur opacity 0→1.
          Wrapper still owns saturate/brightness/contrast (point ops, cheap) + transform.
          No more per-frame filter:blur() — eliminates a per-frame GPU convolution
          on a 1920px element (brief §2.4 + §8.3.2 "static precomputation"). */}
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
          willChange: 'transform',
        }}
      >
        {/* Sharp layer — opacity 1 initially, fades to 0 on scroll */}
        <picture ref={sharpLayerRef} style={{ position: 'absolute', inset: 0, opacity: 1, willChange: 'opacity' }}>
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
        {/* Pre-blurred layer — opacity 0 initially, fades to 1 on scroll.
            Tiny (2.7 KB AVIF @ 1920px) — fetchPriority=low so it doesn't compete
            with the LCP image preload. loading=eager so it's ready before scroll. */}
        <picture ref={blurLayerRef} style={{ position: 'absolute', inset: 0, opacity: 0, willChange: 'opacity' }}>
          <source type="image/avif" srcSet="/images/landing-400-blur.avif 400w, /images/landing-800-blur.avif 800w, /images/landing-1280-blur.avif 1280w, /images/landing-1920-blur.avif 1920w" sizes="100vw" />
          <source type="image/webp" srcSet="/images/landing-400-blur.webp 400w, /images/landing-800-blur.webp 800w, /images/landing-1280-blur.webp 1280w, /images/landing-1920-blur.webp 1920w" sizes="100vw" />
          <img
            src="/images/landing-fallback.jpg"
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            fetchPriority="low"
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
        {/* name — bold. Phase 5b.2: split into per-letter spans for spring stagger reveal. */}
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
            letterSpacing: isMobile ? '-0.05em' : '-0.03em',
            transition: 'transform 0.95s var(--ease-reveal) 0.14s, opacity 0.7s var(--ease-opacity) 0.14s',
            textShadow: '0 2px 40px rgba(10, 10, 10, 0.8)',
            textAlign: isMobile ? 'left' : 'center',
          }}
        >
          {renderNameWithStagger()}
        </h1>

        {/* subline — humble */}
        <p
          data-hero-3d-lines=""
          className="text-body-lg"
          style={{
            color: 'var(--canvas)',
            opacity: 1,
            marginBlock: '1.5rem 0 0',
            textShadow: '0 1px 20px rgba(10, 10, 10, 0.8)',
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
