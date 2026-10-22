'use client';

import { useEffect, useRef } from 'react';

/**
 * Footer — clip-reveal: un-masks from the bottom up as it enters,
 * like a page being laid down. Giant wordmark, tagline, email, legal.
 *
 * Sticky-to-bottom behavior is handled by the page wrapper (min-h-screen
 * flex flex-col + mt-auto on footer).
 */
export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const footer = footerRef.current;
    if (!footer) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = footer.getBoundingClientRect();
      const innerH = window.innerHeight;
      const p = Math.max(0, Math.min(1, (innerH - rect.top) / (innerH * 0.6)));
      const n = 1 - Math.pow(1 - p, 3); // cubic-out
      const bottom = (1 - n) * 100;
      const side = (1 - n) * 7;
      footer.style.clipPath = `inset(${(1 - n) * 5}% ${side}% ${bottom}% ${side}%)`;
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

  return (
    <footer
      ref={footerRef}
      data-canvas="home"
      className="night-active"
      style={{
        marginTop: 'auto',
        background: 'var(--night)',
        color: 'var(--canvas)',
        paddingTop: 'calc(48 * var(--px))',
        paddingBottom: 'calc(28 * var(--px))',
        borderTop: '1px solid rgba(184, 153, 104, 0.18)',
        position: 'relative',
        overflow: 'hidden',
        // initial clip — fully masked from below
        clipPath: 'inset(5% 7% 100% 7%)',
      }}
    >
      <div className="canvas-max" style={{ position: 'relative' }}>
        {/* giant wordmark — fills width */}
        <h2
          aria-label="Dhivakaran"
          style={{
            margin: 0,
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: 'clamp(3rem, 14vw, 14rem)',
            lineHeight: 0.85,
            letterSpacing: '-0.04em',
            color: 'var(--canvas)',
            whiteSpace: 'nowrap',
            textOverflow: 'clip',
            overflow: 'hidden',
          }}
        >
          Dhivakaran M<span style={{ color: 'var(--accent)', fontSize: '0.4em', verticalAlign: 'super' }}>®</span>
        </h2>

        {/* hairline */}
        <div
          aria-hidden="true"
          style={{
            height: '1px',
            background: 'rgba(184, 153, 104, 0.18)',
            marginBlock: 'calc(40 * var(--px))',
          }}
        />

        {/* tagline + email */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 'calc(28 * var(--px))',
            alignItems: 'end',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-fraunces), serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                lineHeight: 1.2,
                color: 'var(--canvas)',
                letterSpacing: '-0.015em',
                maxWidth: '32ch',
              }}
            >
              Your vision, my creativity.
              <br />
              Let\u2019s make it real.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <a
              href="mailto:dhivakaranmohanraj@gmail.com"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 500,
                fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                color: 'var(--canvas)',
                textDecoration: 'none',
                borderBottom: '1.5px solid rgba(184, 153, 104, 0.4)',
                paddingBottom: '2px',
                transition: 'border-color 0.3s var(--ease-out-soft)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brass)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(184, 153, 104, 0.4)';
              }}
            >
              dhivakaranmohanraj@gmail.com
            </a>
          </div>
        </div>

        {/* legal + back to top */}
        <div
          style={{
            marginTop: 'calc(48 * var(--px))',
            paddingTop: 'calc(20 * var(--px))',
            borderTop: '1px solid rgba(184, 153, 104, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div
            className="text-mono text-label"
            style={{ color: 'var(--night-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}
          >
            <span>© 0250 DHIVAKARAN M®</span>
            <span>ALL FRAMES RESERVED</span>
            <span style={{ opacity: 0.6 }}>BUILT BY HAND · COLOMBO</span>
          </div>
          <a
            href="#top"
            aria-label="Back to top"
            className="text-mono text-label"
            style={{
              color: 'var(--brass-soft)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1.5px solid rgba(184, 153, 104, 0.4)',
              padding: '0.5rem 0.9rem',
              transition: 'border-color 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--brass)';
              e.currentTarget.style.color = 'var(--canvas)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(184, 153, 104, 0.4)';
              e.currentTarget.style.color = 'var(--brass-soft)';
            }}
          >
            ↑ BACK TO FRAME 0000
          </a>
        </div>
      </div>
    </footer>
  );
}
