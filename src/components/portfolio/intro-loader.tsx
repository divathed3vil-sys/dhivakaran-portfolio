'use client';

import { useEffect, useState } from 'react';

/**
 * IntroLoader — "film leader" countdown.
 * A frame counter ticks 0241 → 0250 over ~1.4s, the wordmark develops
 * letter-by-letter from blur to sharp, a brass aperture blade irises open.
 * Respects reduced-motion (skipped entirely).
 *
 * Removes html[data-loading] on exit so the hero 3D rise can play.
 */
export function IntroLoader() {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>('in');
  const [frame, setFrame] = useState(241);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // reduced motion: skip loader entirely (deferred to avoid sync setState)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.removeAttribute('data-loading');
      const skipTimer = setTimeout(() => setPhase('done'), 0);
      return () => clearTimeout(skipTimer);
    }

    // frame counter: 0241 → 0250 over ~1.4s
    const frameInterval = setInterval(() => {
      setFrame((f) => {
        if (f >= 250) {
          clearInterval(frameInterval);
          return f;
        }
        return f + 1;
      });
    }, 130);

    // schedule exit
    const exitTimer = setTimeout(() => setPhase('out'), 1880);
    const doneTimer = setTimeout(() => {
      document.documentElement.removeAttribute('data-loading');
      setPhase('done');
    }, 2440);

    return () => {
      clearInterval(frameInterval);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'done') return null;

  const letters = 'DHIVAKARAN M'.split('');
  const word = phase === 'in';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--night)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        animation: phase === 'out' ? 'loader-letter-out 0.42s var(--ease-curtain) both' : 'none',
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 0.42s var(--ease-curtain)',
      }}
    >
      {/* frame counter */}
      <div
        className="leader-track text-label"
        style={{
          color: 'var(--brass)',
          opacity: 0.7,
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
        }}
      >
        <span>FRAME </span>
        <span style={{ display: 'inline-block', minWidth: '4ch' }}>
          {String(frame).padStart(4, '0')}
        </span>
        <span> / 0250</span>
      </div>

      {/* aperture iris */}
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '1.5px solid var(--brass)',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--brass)',
            animation: 'iris-pulse 1.4s var(--ease-out-soft) infinite',
          }}
        />
      </div>

      {/* wordmark developing */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          fontFamily: 'var(--font-fraunces), serif',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--canvas)',
          overflow: 'hidden',
        }}
      >
        {letters.map((c, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              animation: `loader-letter-in 0.62s var(--ease-out-soft) ${45 * i}ms both`,
              filter: word ? 'blur(0)' : 'blur(8px)',
              opacity: word ? 1 : 0,
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* sub-line removed — keep loader minimal */}
      <div
        className="text-label"
        style={{
          color: 'var(--night-muted)',
          opacity: 0.5,
          marginTop: '0.5rem',
        }}
      >
        0250 ASA · DAYLIGHT
      </div>

      <style>{`
        @keyframes iris-pulse {
          0%, 100% { transform: scale(0.4); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
