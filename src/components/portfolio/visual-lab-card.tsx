'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * VisualLabCard — a blurry glimpse of the real Visual Lab.
 *
 * - Default: very blurry (20px) snapshot of lab tiles, text blurred + shifted
 * - Hover: lab de-blurs (20→6px), text sharpens + settles into place (phase reveal)
 * - No scroll reaction. Only mouse-hover interactive.
 * - Only text: "Enter The Visual Lab" (not a button — just text on the card)
 * - Click anywhere opens the overlay
 */
export function VisualLabCard({ onEnter }: { onEnter: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [images, setImages] = useState<string[]>(['/images/landing-400.avif']);
  const cardRef = useRef<HTMLElement>(null);

  // fetch real lab image URLs from Supabase (graceful — falls back to landing image)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getLabImageUrls } = await import('@/lib/supabase-data');
        const { lowResUrl } = await import('./lib/use-portfolio-data');
        const urls = await getLabImageUrls();
        if (!cancelled && urls.length > 0) {
          setImages(urls.map(u => lowResUrl(u, 400)));
        }
      } catch (e) {
        // keep the landing image fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Use new AVIF landing-low variant as fallback (400px, 1.7 KB)
  const fallbackImg = '/images/landing-400.avif';

  useEffect(() => {
    const t = setTimeout(() => setIsTouch(window.matchMedia('(hover: none)').matches), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="visual-lab-card"
      ref={cardRef}
      data-canvas="home"
      aria-label="Enter the Visual Lab"
      role="button"
      tabIndex={0}
      onClick={onEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEnter();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: '70vh',
        minHeight: '480px',
        overflow: 'hidden',
        background: 'var(--night)',
        cursor: 'pointer',
        // Phase 3 — skip paint/layout when offscreen + isolate layout/paint
        // when onscreen (the 12 blurred tile imgs are heavy without containment).
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 70vh',
        contain: 'layout paint',
      }}
    >
      {/* blurry glimpse of the lab — a grid of <img> tiles, heavily blurred.
          loading=lazy + decoding=async so offscreen tiles don't block first paint.
          The wrapper div still owns the blur filter + scale transform. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-8%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '4px',
          filter: isTouch ? 'blur(0px)' : (hovered ? 'blur(6px)' : 'blur(22px)'),
          transform: isTouch ? 'scale(1)' : (hovered ? 'scale(1.02)' : 'scale(1.08)'),
          transition: 'filter 0.9s var(--ease-out-soft), transform 0.9s var(--ease-out-soft)',
        }}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const imgs = images.length > 0 ? images : [fallbackImg];
          const src = imgs[i % imgs.length];
          return (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={400}
              height={300}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${(i * 23) % 100}% ${(i * 37) % 100}%`,
                filter: 'grayscale(1) contrast(1.1) brightness(0.7)',
                display: 'block',
              }}
            />
          );
        })}
      </div>

      {/* darkening overlay for text legibility */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: isTouch
            ? 'linear-gradient(180deg, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.4) 100%)'
            : (hovered
              ? 'linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.55) 100%)'
              : 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.75) 100%)'),
          transition: 'background 0.9s var(--ease-out-soft)',
          pointerEvents: 'none',
        }}
      />

      {/* "Enter The Visual Lab" — text, not a button. Blurs + shifts by default, sharpens on hover. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: 'clamp(2rem, 6vw, 5rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--canvas)',
            textAlign: 'center',
            opacity: isTouch ? 1 : (hovered ? 1 : 0.55),
            filter: isTouch ? 'blur(0px)' : (hovered ? 'blur(0px)' : 'blur(8px)'),
            transform: isTouch ? 'translateY(0)' : (hovered ? 'translateY(0)' : 'translateY(10px)'),
            transition:
              'filter 0.9s var(--ease-out-soft), transform 0.9s var(--ease-out-soft), opacity 0.9s var(--ease-out-soft)',
            textShadow: '0 2px 30px rgba(10, 10, 10, 0.5)',
          }}
        >
          Enter The Visual Lab
        </h2>
      </div>
    </section>
  );
}
