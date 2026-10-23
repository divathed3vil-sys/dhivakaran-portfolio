'use client';

import { useEffect } from 'react';
import { useStudio } from './studio-provider';

/**
 * StudioOverlay — the full-screen admin overlay. Shows when authed.
 *
 * Phase 2 (this): minimal shell — "Studio" title, sign-out button, and a
 * placeholder for the 4 tabs. Phase 3+ builds the real CRUD forms
 * (Selected Frames / Lab / Videos / Site Settings).
 */
export function StudioOverlay() {
  const { authed, closeStudio } = useStudio();

  // Esc to close + sign out
  useEffect(() => {
    if (!authed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStudio();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authed, closeStudio]);

  if (!authed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'var(--night)',
        color: 'var(--canvas)',
        overflow: 'auto',
        animation: 'studio-in 0.5s var(--ease-out-soft)',
      }}
    >
      <div
        className="canvas-max"
        style={{
          paddingBlock: 'calc(48 * var(--px))',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'calc(32 * var(--px))',
            paddingBottom: 'calc(20 * var(--px))',
            borderBottom: '1.5px solid var(--night-hr)',
          }}
        >
          <div>
            <div
              className="text-mono text-label"
              style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}
            >
              ◉ STUDIO
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 500,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                margin: 0,
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                color: 'var(--canvas)',
              }}
            >
              Control Room
            </h1>
          </div>
          <button
            type="button"
            onClick={closeStudio}
            style={{
              padding: '0.6rem 1.1rem',
              border: '1.5px solid var(--accent)',
              color: 'var(--canvas)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              transition: 'background 0.3s var(--ease-out-soft)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Sign Out ↑
          </button>
        </div>

        {/* tabs placeholder — Phase 3 builds real CRUD */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 'calc(20 * var(--px))',
            flex: 1,
          }}
        >
          {['Selected Frames', 'Visual Lab', 'Videos', 'Site Settings'].map((tab, i) => (
            <div
              key={tab}
              style={{
                border: '1.5px solid var(--night-hr)',
                padding: 'calc(24 * var(--px))',
                background: 'var(--night-soft)',
              }}
            >
              <div
                className="text-mono text-label"
                style={{ color: 'var(--accent)', opacity: 0.85, marginBottom: '0.6rem' }}
              >
                TAB 0{i + 1}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
                  margin: 0,
                  color: 'var(--canvas)',
                  letterSpacing: '-0.02em',
                }}
              >
                {tab}
              </h2>
              <p
                className="text-body"
                style={{ color: 'var(--night-muted)', margin: '0.6rem 0 0' }}
              >
                Management interface — coming in Phase 3.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
