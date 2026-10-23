'use client';

import { useRef, useState } from 'react';

const IMAGES = ['/images/portrait-low.webp', '/images/atmosphere-low.webp', '/images/object-lens-low.webp'];

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
  const cardRef = useRef<HTMLElement>(null);

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
          filter: hovered ? 'blur(6px)' : 'blur(22px)',
          transform: hovered ? 'scale(1.02)' : 'scale(1.08)',
          transition: 'filter 0.9s var(--ease-out-soft), transform 0.9s var(--ease-out-soft)',
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              backgroundImage: `url(${IMAGES[i % IMAGES.length]})`,
              backgroundSize: 'cover',
              backgroundPosition: `${(i * 23) % 100}% ${(i * 37) % 100}%`,
              filter: 'grayscale(1) contrast(1.1) brightness(0.7)',
            }}
          />
        ))}
      </div>

      {/* darkening overlay for text legibility */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: hovered
            ? 'linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.55) 100%)'
            : 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.75) 100%)',
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
            filter: hovered ? 'blur(0px)' : 'blur(8px)',
            transform: hovered ? 'translateY(0)' : 'translateY(10px)',
            opacity: hovered ? 1 : 0.55,
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
