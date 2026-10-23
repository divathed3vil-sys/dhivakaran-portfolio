'use client';

import { useEffect, useRef, useState } from 'react';
import { getLabImageUrls } from '@/lib/supabase-data';
import { lowResUrl } from './lib/use-portfolio-data';

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
  const [images, setImages] = useState<string[]>([]);
  const cardRef = useRef<HTMLElement>(null);

  // fetch real lab image URLs from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls = await getLabImageUrls();
      if (!cancelled) setImages(urls.map(u => lowResUrl(u, 400)));
    })();
    return () => { cancelled = true; };
  }, []);

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
      }}
    >
      {/* blurry glimpse of the lab — a grid of tiles, heavily blurred */}
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
          const imgs = images.length > 0 ? images : ['/images/landing-low.webp'];
          return (
            <div
              key={i}
              style={{
                backgroundImage: `url(${imgs[i % imgs.length]})`,
                backgroundSize: 'cover',
                backgroundPosition: `${(i * 23) % 100}% ${(i * 37) % 100}%`,
                filter: 'grayscale(1) contrast(1.1) brightness(0.7)',
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
