'use client';

import { useEffect, useRef, useState } from 'react';

type Project = {
  index: string;
  title: string;
  category: string;
  year: string;
  role: string;
  summary: string;
  src: string;
  bgPos: string;
};

const PROJECTS: Project[] = [
  {
    index: '01',
    title: 'Atelier North',
    category: 'BRAND IDENTITY',
    year: '2024',
    role: 'Identity · Naming · Voice',
    summary:
      'A full identity system for a Nordic architectural atelier — mark, wordmark, voice, and a printed monograph.',
    src: '/images/atmosphere.png',
    bgPos: '20% 40%',
  },
  {
    index: '02',
    title: 'Kovil Press',
    category: 'EDITORIAL · TYPE',
    year: '2024',
    role: 'Editorial · Type · Print',
    summary:
      'A print-first type journal. Three issues, hand-set, with a custom variable display face cut for the masthead.',
    src: '/images/object-lens.png',
    bgPos: '50% 50%',
  },
  {
    index: '03',
    title: 'Night Soil Co.',
    category: 'PRODUCT DESIGN',
    year: '2023',
    role: 'Product · UX · System',
    summary:
      'A heritage goods marketplace. Component system, design tokens, and the quiet interaction grammar of the catalog.',
    src: '/images/portrait.png',
    bgPos: '50% 30%',
  },
  {
    index: '04',
    title: 'Half-Light Films',
    category: 'MOTION · 3D',
    year: '2023',
    role: 'Title Sequence · Score',
    summary:
      'A title sequence and identity for an independent short film. Time, grain, and a brass aperture that won\u2019t close.',
    src: '/images/atmosphere.png',
    bgPos: '70% 60%',
  },
  {
    index: '05',
    title: 'Paper & Ash',
    category: 'ART DIRECTION',
    year: '2022',
    role: 'Campaign · Photography',
    summary:
      'A campaign for a paper mill. Five frames, one material, and the long argument for restraint over decoration.',
    src: '/images/object-lens.png',
    bgPos: '30% 70%',
  },
];

/**
 * SelectedWork — accordion of placeholder projects between About and
 * the Visual Lab card.
 *
 * Design (cinematic + grunge):
 *  - Desktop: hover/center-driven accordion. Active row expands; cover
 *    image reveals on the right with a BLUR-TO-FOCUS pull (the user's
 *    "getting focus" effect).
 *  - Non-active rows dim to 0.45; active title turns accent red.
 *  - Covers are grayscale, with a per-tile dust overlay + slight rotation
 *    for grunge. Frame numbers in mono.
 *  - Metadata (role/category/year) fades + slides in when the row is active.
 *  - Mobile: stacked cards, cover always visible (16/10), no accordion.
 *  - Closes with a "VIEW FULL INDEX →" link (placeholder).
 *
 * Placeholder projects — user swaps in real ones later.
 */
export function SelectedWork() {
  const [activeIdx, setActiveIdx] = useState<number | null>(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  // on touch / no-hover devices, pick the row nearest viewport center
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > 0.55) {
              const idx = Number((e.target as HTMLElement).dataset.idx);
              setActiveIdx(idx);
            }
          });
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.55, 1] }
      );
      rowRefs.current.forEach((el) => el && io.observe(el));
      return () => io.disconnect();
    }
  }, []);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

  return (
    <section
      id="work"
      data-canvas="home"
      aria-label="Selected work"
      style={{
        background: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="canvas-max" style={{ position: 'relative' }}>
        {/* eyebrow */}
        <div
          className="text-label"
          style={{
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: 'calc(28 * var(--px))',
          }}
        >
          <span style={{ display: 'inline-block', width: '24px', height: '1.5px', background: 'var(--accent)' }} />
          ( SELECTED WORK · 0005 · PLACEHOLDERS )
        </div>

        {/* title */}
        <h2
          className="text-section"
          style={{
            color: 'var(--ink)',
            margin: 0,
            maxWidth: '14ch',
          }}
        >
          Selected{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--muted)' }}>
            frames
          </em>
        </h2>

        <hr
          className="hairline"
          style={{ margin: 'calc(38 * var(--px)) 0 0' }}
        />

        {/* accordion list — desktop only (mobile renders stacked below) */}
        <ul
          ref={listRef}
          className="work-list-desktop"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {PROJECTS.map((p, i) => {
            const active = activeIdx === i;
            return (
              <li
                key={p.index}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onFocus={() => setActiveIdx(i)}
                tabIndex={0}
                style={{
                  borderBottom: '1.5px solid var(--rule)',
                  paddingBlock: 'calc(24 * var(--px))',
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 'calc(24 * var(--px))',
                  cursor: 'pointer',
                  transition: 'opacity 0.5s var(--ease-out-soft)',
                  opacity: active || activeIdx === null ? 1 : 0.45,
                  outline: 'none',
                }}
              >
                {/* row header — index + title + category + year */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(60px, auto) 1fr auto',
                    gap: 'calc(24 * var(--px))',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="text-mono text-label"
                    style={{ color: 'var(--accent)', opacity: 0.85 }}
                  >
                    N° {p.index}
                  </span>
                  <h3
                    className="text-project"
                    style={{
                      margin: 0,
                      color: active ? 'var(--accent)' : 'var(--ink)',
                      transition: 'color 0.4s var(--ease-out-soft)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.05,
                    }}
                  >
                    {p.title}
                  </h3>
                  <span
                    className="text-mono text-label"
                    style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}
                  >
                    {p.category} · {p.year}
                  </span>
                </div>

                {/* reveal block — cover + summary + role (expands when active) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 'calc(24 * var(--px))',
                    maxHeight: active ? '400px' : '0px',
                    opacity: active ? 1 : 0,
                    overflow: 'hidden',
                    transition:
                      'max-height 0.5s var(--ease-out-soft), opacity 0.5s var(--ease-out-soft)',
                    paddingLeft: 'calc(84 * var(--px))',
                  }}
                  className="work-reveal-block"
                >
                  {/* cover image — grayscale, blur-to-focus on active */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 'calc(330 * var(--px))',
                      aspectRatio: '3 / 2',
                      overflow: 'hidden',
                      transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 0.6}deg)`,
                      boxShadow: '0 12px 32px -10px rgba(10, 10, 10, 0.35)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${p.src})`,
                        backgroundSize: 'cover',
                        backgroundPosition: p.bgPos,
                        filter: active
                          ? 'grayscale(1) contrast(1.1) brightness(0.88) blur(0px)'
                          : 'grayscale(1) contrast(1.1) brightness(0.88) blur(14px)',
                        transform: active ? 'scale(1)' : 'scale(1.08)',
                        transition:
                          'filter 0.6s var(--ease-out-soft), transform 0.6s var(--ease-out-soft)',
                      }}
                    />
                    {/* dust overlay */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage:
                          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23d)'/></svg>\")",
                        backgroundSize: '100px 100px',
                        mixBlendMode: 'overlay',
                        opacity: active ? 0.6 : 0.4,
                        pointerEvents: 'none',
                        transition: 'opacity 0.5s var(--ease-out-soft)',
                      }}
                    />
                    {/* frame border */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        border: '6px solid var(--canvas)',
                        boxShadow: 'inset 0 0 0 1px rgba(10, 10, 10, 0.25)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* frame number */}
                    <div
                      className="text-mono text-label"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        color: 'var(--canvas)',
                        background: 'rgba(10, 10, 10, 0.55)',
                        padding: '2px 6px',
                        opacity: 0.85,
                      }}
                    >
                      FR {p.index} / 05
                    </div>
                  </div>

                  {/* summary + role */}
                  <div style={{ maxWidth: '46ch' }}>
                    <div
                      className="text-mono text-label"
                      style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}
                    >
                      {p.role}
                    </div>
                    <p
                      className="text-body-lg"
                      style={{ color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}
                    >
                      {p.summary}
                    </p>
                    {/* jump-to link */}
                    <div
                      style={{
                        marginTop: '1.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        paddingBlock: '0.45rem',
                        borderBottom: '1px solid var(--ink)',
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.75rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span>Jump to project</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        style={{ transition: 'transform 0.3s var(--ease-out-soft)' }}
                      >
                        <path
                          d="M2 7H12M12 7L7 2M12 7L7 12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* mobile stacked cards — always visible covers */}
        <div className="work-list-mobile" style={{ display: 'none' }}>
          {PROJECTS.map((p, i) => (
            <article
              key={p.index}
              style={{
                borderBottom: '1.5px solid var(--rule)',
                paddingBlock: 'calc(20 * var(--px))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 'calc(12 * var(--px))',
                }}
              >
                <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>
                  N° {p.index}
                </span>
                <span className="text-mono text-label" style={{ color: 'var(--muted)' }}>
                  {p.year}
                </span>
              </div>
              <h3
                className="text-project"
                style={{
                  margin: '0 0 calc(16 * var(--px))',
                  color: 'var(--ink)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                }}
              >
                {p.title}
              </h3>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 10',
                  overflow: 'hidden',
                  marginBottom: 'calc(12 * var(--px))',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${p.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: p.bgPos,
                    filter: 'grayscale(1) contrast(1.1) brightness(0.88)',
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '6px solid var(--canvas)',
                    boxShadow: 'inset 0 0 0 1px rgba(10, 10, 10, 0.25)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>
                {p.role}
              </div>
              <p className="text-body" style={{ color: 'var(--muted)', margin: 0 }}>
                {p.summary}
              </p>
            </article>
          ))}
        </div>

        {/* footer note */}
        <div
          className="text-label"
          style={{
            color: 'var(--muted)',
            marginTop: 'calc(40 * var(--px))',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <span>( PLACEHOLDERS — REAL WORK INCOMING )</span>
          <a
            href="#work"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.9rem',
              border: '1.5px solid var(--rule)',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              transition: 'border-color 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
          >
            VIEW FULL INDEX →
          </a>
        </div>
      </div>

      <style>{`
        /* responsive: desktop accordion vs mobile stack */
        @media (min-width: 1024px) {
          .work-list-mobile { display: none !important; }
          .work-list-desktop { display: block; }
          .work-reveal-block {
            grid-template-columns: calc(330 * var(--px)) 1fr !important;
            align-items: start;
          }
        }
        @media (max-width: 1023px) {
          .work-list-desktop { display: none !important; }
          .work-list-mobile { display: block !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .work-reveal-block { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
