'use client';

import { useEffect, useRef } from 'react';
import {
  MessageCircle,
  Mail,
} from 'lucide-react';
import { WaveText } from './wave-text';
import { BokehField } from './bokeh-field';
import { useBloom } from './lib/use-bloom-rack';

const CONTACTS = [
  {
    label: 'WHATSAPP',
    value: '+94 77 089 5006',
    href: 'https://wa.me/94770895006',
    icon: MessageCircle,
    note: 'REPLIES MOST DAYS',
  },
  {
    label: 'EMAIL',
    value: 'dhivakaranmohanraj@gmail.com',
    href: 'mailto:dhivakaranmohanraj@gmail.com',
    icon: Mail,
    note: 'BRIEFS, INTROS, LONG MESSAGES WELCOME',
  },
];

/**
 * Contact — the "final print" emerging from the developer tray.
 *
 * Inventions:
 *  - Panel un-masks from the bottom up via clip-path as you scroll in
 *    (like a print sliding out of the tray — the unifying metaphor)
 *  - Oversized headline develops letter-by-letter (WaveText, light → dark)
 *  - Three contact "plates": WhatsApp, Email, Socials — bordered brass-on-parchment
 *  - NO form, NO submit, NO backend (per architecture handoff)
 *  - NO AI-feeling microcopy
 */
export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bloomRef = useBloom<HTMLDivElement>();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const section = sectionRef.current;
    const panel = panelRef.current;
    if (!section || !panel) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = section.getBoundingClientRect();
      const innerH = window.innerHeight;
      // progress 0 → 1 over first 60% of viewport entry
      const p = Math.max(0, Math.min(1, (innerH - rect.top) / (innerH * 0.6)));
      // cubic-out
      const n = 1 - Math.pow(1 - p, 3);
      // un-mask from bottom up: inset(top right bottom left) — start: bottom 100%, end: bottom 0%
      const bottom = (1 - n) * 100;
      const side = (1 - n) * 7;
      panel.style.clipPath = `inset(${(1 - n) * 5}% ${side}% ${bottom}% ${side}%)`;
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
    <section
      id="contact"
      ref={sectionRef}
      data-canvas="home"
      className="night-active"
      style={{
        background: 'var(--night)',
        color: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px)) calc(40 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
        // Phase 3 — skip paint/layout when offscreen.
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 80vh',
      }}
      aria-label="Contact — the final print"
    >
      {/* ambient brass glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '40%',
          right: '10%',
          width: '50vw',
          height: '50vw',
          maxWidth: '700px',
          maxHeight: '700px',
          background:
            'radial-gradient(circle, rgba(184, 153, 104, 0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <BokehField count={6} />

      <div
        ref={(node) => {
          panelRef.current = node;
          bloomRef.current = node;
        }}
        className="canvas-max"
        style={{
          position: 'relative',
          background: 'var(--canvas)',
          color: 'var(--ink)',
          paddingBlock: 'calc(64 * var(--px))',
          paddingInline: 'calc(28 * var(--px))',
          boxShadow: '0 18px 60px -12px rgba(0,0,0,0.7)',
          // initial clip — fully masked
          clipPath: 'inset(5% 7% 100% 7%)',
        }}
      >
        {/* eyebrow */}
        <div
          className="text-label"
          style={{
            color: 'var(--muted)',
            marginBottom: 'calc(28 * var(--px))',
          }}
        >
          The final print
        </div>

        {/* oversized developing headline — reveals in one scroll pass via rootRef */}
        <WaveText
          text="Let's make something that holds together."
          as="h2"
          className="text-section"
          rootRef={sectionRef}
          speedMultiplier={4}
        />

        {/* subline */}
        <p
          className="text-body-lg"
          style={{
            color: 'var(--muted)',
            maxWidth: '52ch',
            marginBlock: 'calc(24 * var(--px)) calc(48 * var(--px))',
          }}
        >
          Open for brand systems, product surfaces, art direction, and the
          occasional strange commission. Write a line — I read every one.
        </p>

        <hr className="hairline" style={{ margin: 0 }} />

        {/* direct contact plates */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 0,
            marginTop: 0,
          }}
        >
          {CONTACTS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'calc(16 * var(--px))',
                paddingBlock: 'calc(24 * var(--px))',
                paddingInline: 'calc(8 * var(--px))',
                borderBottom: '1.5px solid var(--rule)',
                borderRight: '1.5px solid var(--rule)',
                textDecoration: 'none',
                color: 'var(--ink)',
                transition: 'background 0.3s var(--ease-out-soft)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bone-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--brass)',
                  color: 'var(--brass)',
                  flexShrink: 0,
                }}
              >
                <c.icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                <span className="text-mono text-label" style={{ color: 'var(--muted)' }}>
                  {c.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                    letterSpacing: '-0.015em',
                    color: 'var(--ink)',
                    lineHeight: 1.1,
                  }}
                >
                  {c.value}
                </span>
                <span className="text-mono text-label" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  {c.note}
                </span>
              </span>
            </a>
          ))}
        </div>

        {/* signature */}
        <div
          style={{
            marginTop: 'calc(40 * var(--px))',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            - Diva
          </div>
        </div>
      </div>
    </section>
  );
}
