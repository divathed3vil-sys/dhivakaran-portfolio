'use client';

import { useEffect, useRef, useState } from 'react';

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
  { label: 'Experiences', href: '#experiences' },
  { label: 'Contact', href: '#contact' },
];

const MENU_LINKS: NavLink[] = [...NAV_LINKS, { label: 'Top', href: '#top' }];

/**
 * Nav — sticky/relative, wordmark + burger→X morph, full-height
 * slide-in menu, focus trap, Esc, scroll lock.
 *
 * Phase 5b — magnetic hover on wordmark + burger (slight pull toward cursor
 * within 60px range, spring-eased). Burger→X morph uses spring easing.
 * Menu panel slide-in uses spring easing. Link stagger reveal uses spring.
 */
export function Nav({ onEnterLab }: { onEnterLab?: () => void }) {
  const [open, setOpen] = useState(false);
  const wordmarkRef = useRef<HTMLAnchorElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

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

  // Phase 5b — magnetic hover on wordmark + burger.
  // Each element pulls slightly toward cursor when within 60px range.
  // Spring-eased via CSS transition (transform var(--dur-spring-soft) var(--ease-spring-soft)).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const magneticTargets: HTMLElement[] = [];
    if (wordmarkRef.current) magneticTargets.push(wordmarkRef.current);
    if (burgerRef.current) magneticTargets.push(burgerRef.current);
    if (magneticTargets.length === 0) return;

    let rafId = 0;
    const range = 60;

    const onMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        for (const el of magneticTargets) {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
          if (dist < range) {
            const pull = (1 - dist / range) * 0.3; // 0..0.3 — subtle
            const dx = (e.clientX - cx) * pull;
            const dy = (e.clientY - cy) * pull;
            el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          } else {
            el.style.transform = '';
          }
        }
      });
    };

    const onLeave = () => {
      for (const el of magneticTargets) el.style.transform = '';
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

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
          {/* wordmark — Phase 5b magnetic hover via spring transform */}
          <a
            ref={wordmarkRef}
            href="#top"
            className="text-label"
            data-magnetic=""
            style={{
              color: 'var(--canvas)',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '0.15em',
              transition: 'transform var(--dur-spring-soft) var(--ease-spring-soft)',
              willChange: 'transform',
            }}
            aria-label="Dhivakaran — back to top"
          >
            <span>DHIVAKARAN M</span>
            <span style={{ fontSize: '0.7em', verticalAlign: 'super' }}>®</span>
          </a>

          {/* burger — Phase 5b magnetic hover + spring morph */}
          <button
            ref={burgerRef}
            type="button"
            data-magnetic=""
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
              transition: 'transform var(--dur-spring-soft) var(--ease-spring-soft)',
              willChange: 'transform',
            }}
          >
            <span
              style={{
                display: 'block',
                width: '32px',
                height: '2px',
                background: 'var(--canvas)',
                transform: open ? 'translateY(5px) rotate(45deg)' : 'none',
                transition: 'transform var(--dur-spring-soft) var(--ease-spring-soft)',
              }}
            />
            <span
              style={{
                display: 'block',
                width: '32px',
                height: '2px',
                background: 'var(--canvas)',
                transform: open ? 'translateY(-5px) rotate(-45deg)' : 'none',
                transition: 'transform var(--dur-spring-soft) var(--ease-spring-soft)',
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

      {/* menu panel — Phase 5b spring slide-in */}
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
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          visibility: open ? 'visible' : 'hidden',
          transition: 'transform var(--dur-spring-medium) var(--ease-spring-medium), visibility 0s linear ' + (open ? '0s' : '0.7s'),
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
                    transition: 'transform var(--dur-spring-medium) var(--ease-spring-medium), opacity 0.5s var(--ease-out-soft)',
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
