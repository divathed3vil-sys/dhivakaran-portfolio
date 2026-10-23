'use client';

import { useEffect, useState } from 'react';

type NavLink = {
  label: string;
  href?: string;
  action?: 'lab';
};

const NAV_LINKS: NavLink[] = [
  { label: 'About', href: '#about' },
  { label: 'Selected Work', href: '#work' },
  { label: 'Videos', href: '#videos' },
  { label: 'Visual Lab', action: 'lab' },
  { label: 'Experiences', href: '#skillset' },
  { label: 'Contact', href: '#contact' },
];

const MENU_LINKS: NavLink[] = [...NAV_LINKS, { label: 'Top', href: '#top' }];

/**
 * Nav — sticky/relative, wordmark + burger→X morph, full-height
 * slide-in menu, focus trap, Esc, scroll lock.
 */
export function Nav({ onEnterLab }: { onEnterLab?: () => void }) {
  const [open, setOpen] = useState(false);

  // esc to close, scroll lock when open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          paddingBlock: '0.85rem',
          paddingInline: '1.5rem',
          mixBlendMode: 'difference',
        }}
        data-cursor=""
      >
        <nav
          className="canvas-max flex items-center justify-between"
          style={{ maxWidth: '100%' }}
        >
          {/* wordmark */}
          <a
            href="#top"
            className="text-label"
            style={{
              color: 'var(--canvas)',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '0.15em',
            }}
            aria-label="Dhivakaran — back to top"
          >
            <span>DHIVAKARAN M</span>
            <span style={{ fontSize: '0.7em', verticalAlign: 'super' }}>®</span>
          </a>

          {/* burger */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="menu-panel"
            onClick={() => setOpen((o) => !o)}
            style={{
              width: '56px',
              height: '40px',
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: '8px',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                display: 'block',
                width: '32px',
                height: '2px',
                background: 'var(--canvas)',
                transform: open ? 'translateY(5px) rotate(45deg)' : 'none',
                transition: 'transform 0.3s var(--ease-out-soft)',
              }}
            />
            <span
              style={{
                display: 'block',
                width: '32px',
                height: '2px',
                background: 'var(--canvas)',
                transform: open ? 'translateY(-5px) rotate(-45deg)' : 'none',
                transition: 'transform 0.3s var(--ease-out-soft)',
              }}
            />
          </button>
        </nav>
      </header>

      {/* scrim */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: 'rgba(11, 10, 8, 0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.42s var(--ease-out-soft)',
        }}
      />

      {/* menu panel */}
      <aside
        id="menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          width: 'min(420px, 100vw)',
          background: 'var(--night)',
          color: 'var(--canvas)',
          transform: open ? 'translateX(0)' : 'translateX(100%))',
          visibility: open ? 'visible' : 'hidden',
          transition: 'transform 0.62s var(--ease-out-soft), visibility 0s linear ' + (open ? '0s' : '0.62s'),
          padding: 'calc(22 * var(--px)) 1.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {MENU_LINKS.map((link, i) => {
              const handle = (e: React.MouseEvent) => {
                setOpen(false);
                if (link.action === 'lab' && onEnterLab) {
                  e.preventDefault();
                  // small delay so menu closes first
                  setTimeout(onEnterLab, 100);
                }
              };
              return (
                <li key={link.label}>
                  <a
                    href={link.href || '#'}
                    onClick={handle}
                    style={{
                    display: 'block',
                    paddingBlock: '0.5rem',
                    fontSize: 'clamp(1.625rem, 4vw, 2.5rem)',
                    lineHeight: 1.1,
                    color: 'var(--canvas)',
                    textDecoration: 'none',
                    opacity: open ? 1 : 0,
                    transform: open ? 'translateY(0)' : 'translateY(105%)',
                    transition: 'transform 0.64s var(--ease-out-soft), opacity 0.64s var(--ease-out-soft)',
                    transitionDelay: open ? `${180 + 55 * i}ms` : '0ms',
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {link.label}
                </a>
              </li>
              );
            })}
          </ul>
        </div>

        <div
          className="text-label"
          style={{ color: 'var(--night-muted)', lineHeight: 1.6 }}
        >
          <div>Dhivakaran M</div>
        </div>
      </aside>
    </>
  );
}
