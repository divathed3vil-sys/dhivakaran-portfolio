'use client';

import { useRef } from 'react';
import { useReveal } from './lib/use-reveal';

/**
 * VisualLabCard — the entry point to the Visual Lab on the home page.
 *
 * A bold typographic CTA card. On click of "Enter the Lab", opens the
 * VisualLab overlay. The card itself is a teaser: oversized title,
 * atmospheric copy, a grayscale preview swatch, and a clear CTA.
 *
 * This replaces the inline lab section so the home page flows:
 *   Hero → About → VisualLabCard → Skillset → Contact → Footer
 * The lab itself is a separate overlay experience.
 */
export function VisualLabCard({ onEnter }: { onEnter: () => void }) {
  const revealRef = useReveal<HTMLDivElement>(0);

  return (
    <section
      id="visual-lab-card"
      data-canvas="home"
      aria-label="Visual Lab — entry"
      style={{
        background: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
      }}
    >
      <div className="canvas-max" style={{ position: 'relative' }}>
        {/* eyebrow */}
        <div
          className="text-label"
          style={{
            color: 'var(--muted)',
            marginBottom: 'calc(28 * var(--px))',
          }}
        >
          The Visual Lab
        </div>

        {/* the card */}
        <div
          ref={revealRef}
          style={{
            position: 'relative',
            border: '1.5px solid var(--rule)',
            background: 'var(--bone-soft)',
            padding: 'calc(48 * var(--px))',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'border-color 0.4s var(--ease-out-soft)',
          }}
          onClick={onEnter}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEnter();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Enter the Visual Lab"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--rule)';
          }}
        >
          {/* grayscale preview swatch — top-right */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '40%',
              minWidth: '200px',
              maxWidth: '420px',
              height: '100%',
              backgroundImage: 'url(/images/atmosphere.png)',
              backgroundSize: 'cover',
              backgroundPosition: '50% 50%',
              filter: 'grayscale(1) contrast(1.1) brightness(0.85)',
              opacity: 0.5,
              mixBlendMode: 'multiply',
              maskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,1) 60%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,1) 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* content */}
          <div style={{ position: 'relative', maxWidth: '60%' }}>
            <div
              className="text-label"
              style={{
                color: 'var(--accent)',
                marginBottom: 'calc(20 * var(--px))',
              }}
            >
              0049 frames · one plane · infinite
            </div>

            <h2
              className="text-section"
              style={{
                color: 'var(--ink)',
                margin: 0,
                maxWidth: '14ch',
                lineHeight: 0.95,
              }}
            >
              A field of frames,{' '}
              <em
                style={{
                  fontStyle: 'italic',
                  fontWeight: 300,
                  color: 'var(--muted)',
                }}
              >
                infinite
              </em>{' '}
              in every direction.
            </h2>

            <p
              className="text-body-lg"
              style={{
                color: 'var(--muted)',
                maxWidth: '44ch',
                marginBlock: 'calc(24 * var(--px)) calc(32 * var(--px))',
              }}
            >
              Drag, scroll, or arrow-key your way across a toroidally-wrapped
              contact sheet. Frames pull focus as they near the centre and
              fall out of focus at the edges — a camera lens, wandering.
            </p>

            {/* CTA */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.9rem 1.4rem',
                border: '1.5px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--canvas)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.85rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                transition:
                  'background 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft), border-color 0.3s var(--ease-out-soft)',
              }}
            >
              <span>Enter the Visual Lab</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                style={{
                  transition: 'transform 0.3s var(--ease-out-soft)',
                }}
              >
                <path
                  d="M3 9H15M15 9L9 3M15 9L9 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* corner note */}
          <div
            className="text-mono text-label"
            style={{
              position: 'absolute',
              bottom: 'calc(20 * var(--px))',
              right: 'calc(24 * var(--px))',
              color: 'var(--muted)',
              opacity: 0.7,
              textAlign: 'right',
              lineHeight: 1.6,
              pointerEvents: 'none',
            }}
          >
            <div>SEPARATE EXPERIENCE</div>
            <div>OPENS FULL-SCREEN</div>
          </div>
        </div>
      </div>
    </section>
  );
}
