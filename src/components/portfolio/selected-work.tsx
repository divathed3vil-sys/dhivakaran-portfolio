'use client';

import { useEffect, useRef, useState } from 'react';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

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
 * SelectedWork — accordion + alternative contact-sheet grid.
 *
 * Layered effects (non-destructive):
 *  #1  tilt-shift — section gets a 3px blur band when scrolled to edges
 *  #5  Z-parallax — accordion rows: cover 0.7× scroll, title 1.0×, metadata 1.2×
 *  #6  blur-to-focus on active cover (existing, preserved)
 *  #8  halftone on covers (static)
 *  #10 scratched-emulsion hover on covers
 *  #28 negative-invert flash on row activation (400ms)
 *  #30 contact-sheet grid toggle (vs accordion)
 *  #23 bloom on section content entry
 *  #2/#24 heading rack + variable weight
 */
export function SelectedWork() {
  const [activeIdx, setActiveIdx] = useState<number | null>(0);
  const [layout, setLayout] = useState<'accordion' | 'grid'>('accordion');
  const prevActiveRef = useRef<number | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();

  // track active change to trigger neg-flash (#28)
  useEffect(() => {
    if (
      activeIdx !== null &&
      activeIdx !== prevActiveRef.current &&
      prevActiveRef.current !== null
    ) {
      const row = rowRefs.current[activeIdx];
      if (row) {
        const cover = row.querySelector('[data-cover]');
        if (cover) {
          cover.classList.remove('neg-flash');
          void cover.offsetWidth;
          cover.classList.add('neg-flash');
        }
      }
    }
    prevActiveRef.current = activeIdx;
  }, [activeIdx]);

  // Z-parallax (#5) — subtle differential scroll movement on active row's [data-speed]
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 1023px)').matches) return; // desktop only

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const active = activeIdx;
      if (active === null) return;
      const row = rowRefs.current[active];
      if (!row) return;
      const rect = row.getBoundingClientRect();
      // progress: -1 (row below viewport) → 0 (row centered) → 1 (row above)
      const p = (window.innerHeight / 2 - (rect.top + rect.height / 2)) / (window.innerHeight / 2);
      const clamped = Math.max(-1, Math.min(1, p));
      // cover (0.7) drifts less, metadata (1.2) drifts more — differential vs title (1.0)
      row.querySelectorAll<HTMLElement>('[data-speed]').forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '1');
        const ty = (1 - speed) * clamped * 18; // max ~±5px differential, subtle
        // preserve existing transform (rotation on cover)
        const existing = el.style.transform || '';
        const withoutTranslate = existing.replace(/translate3d\([^)]+\)/, '');
        el.style.transform = `${withoutTranslate} translate3d(0, ${ty}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeIdx]);

  // tilt-shift on scroll (#1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = section.getBoundingClientRect();
      const innerH = window.innerHeight;
      // distance of section center from viewport center, normalized
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - innerH / 2);
      const maxDist = innerH * 0.5;
      const edge = Math.min(1, dist / maxDist);
      if (edge > 0.7) {
        section.setAttribute('data-tilt', 'edge');
      } else {
        section.setAttribute('data-tilt', 'active');
      }
    };
    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // touch / no-hover: pick row nearest viewport center
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > 0.55) {
              setActiveIdx(Number((e.target as HTMLElement).dataset.idx));
            }
          });
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.55, 1] }
      );
      rowRefs.current.forEach((el) => el && io.observe(el));
      return () => io.disconnect();
    }
  }, []);

  return (
    <section
      id="work"
      ref={sectionRef}
      data-canvas="home"
      className="tilt-shift"
      aria-label="Selected work"
      style={{
        background: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="canvas-max tilt-shift-inner" style={{ position: 'relative' }}>
        <div ref={bloomRef}>
          {/* title + layout toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: 'calc(28 * var(--px))',
            }}
          >
            <h2
              ref={titleRef}
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

            {/* #30 layout toggle */}
            <div
              style={{
                display: 'inline-flex',
                border: '1.5px solid var(--rule)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {(['accordion', 'grid'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  aria-pressed={layout === mode}
                  style={{
                    padding: '0.5rem 0.9rem',
                    border: 0,
                    background: layout === mode ? 'var(--ink)' : 'transparent',
                    color: layout === mode ? 'var(--canvas)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    letterSpacing: 'inherit',
                    textTransform: 'inherit',
                    transition: 'background 0.3s var(--ease-out-soft), color 0.3s var(--ease-out-soft)',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <hr className="hairline" style={{ margin: '0 0 0' }} />
        </div>

        {/* ACCORDION layout (desktop) */}
        {layout === 'accordion' && (
          <ul
            className="work-list-desktop"
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
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
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(60px, auto) 1fr auto',
                      gap: 'calc(24 * var(--px))',
                      alignItems: 'baseline',
                    }}
                  >
                    <span className="text-mono text-label" style={{ color: 'var(--accent)', opacity: 0.85 }}>
                      N° {p.index}
                    </span>
                    <h3
                      className="text-project work-row-title"
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
                    <span className="text-mono text-label" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {p.category} · {p.year}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 'calc(24 * var(--px))',
                      maxHeight: active ? '420px' : '0px',
                      opacity: active ? 1 : 0,
                      overflow: 'hidden',
                      transition:
                        'max-height 0.5s var(--ease-out-soft), opacity 0.5s var(--ease-out-soft)',
                      paddingLeft: 'calc(84 * var(--px))',
                    }}
                    className="work-reveal-block"
                  >
                    {/* cover — #5 Z-parallax: cover moves at 0.7× via data-speed attr (applied by JS) */}
                    <div
                      data-cover
                      data-speed="0.7"
                      className="halftone scratch-host"
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
                      {/* #10 scratched-emulsion overlay */}
                      <div className="scratch-overlay" />
                      {/* dust */}
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

                    {/* #5 metadata moves at 1.2× via data-speed */}
                    <div data-speed="1.2" style={{ maxWidth: '46ch' }}>
                      <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
                        {p.role}
                      </div>
                      <p className="text-body-lg" style={{ color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>
                        {p.summary}
                      </p>
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
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* GRID layout (#30 contact-sheet) */}
        {layout === 'grid' && (
          <div className="contact-sheet-grid" style={{ marginTop: 'calc(24 * var(--px))' }}>
            {PROJECTS.map((p, i) => (
              <article
                key={p.index}
                className="contact-sheet-cell halftone scratch-host"
                tabIndex={0}
                style={{ background: 'var(--bone-soft)' }}
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
                <div className="scratch-overlay" />
                <div
                  className="text-mono text-label"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    color: 'var(--canvas)',
                    background: 'rgba(10, 10, 10, 0.6)',
                    padding: '2px 6px',
                  }}
                >
                  FR {p.index}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '0.75rem',
                    background: 'linear-gradient(180deg, transparent, rgba(10,10,10,0.85))',
                    color: 'var(--canvas)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                    {p.title}
                  </div>
                  <div className="text-mono text-label" style={{ opacity: 0.8, marginTop: '0.15rem' }}>
                    {p.category} · {p.year}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* mobile stacked cards */}
        <div className="work-list-mobile" style={{ display: 'none' }}>
          {PROJECTS.map((p) => (
            <article
              key={p.index}
              className="halftone"
              style={{
                borderBottom: '1.5px solid var(--rule)',
                paddingBlock: 'calc(20 * var(--px))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'calc(12 * var(--px))' }}>
                <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>N° {p.index}</span>
                <span className="text-mono text-label" style={{ color: 'var(--muted)' }}>{p.year}</span>
              </div>
              <h3 className="text-project" style={{ margin: '0 0 calc(16 * var(--px))', color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {p.title}
              </h3>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', marginBottom: 'calc(12 * var(--px))' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.src})`, backgroundSize: 'cover', backgroundPosition: p.bgPos, filter: 'grayscale(1) contrast(1.1) brightness(0.88)' }} />
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, border: '6px solid var(--canvas)', boxShadow: 'inset 0 0 0 1px rgba(10, 10, 10, 0.25)', pointerEvents: 'none' }} />
              </div>
              <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>{p.role}</div>
              <p className="text-body" style={{ color: 'var(--muted)', margin: 0 }}>{p.summary}</p>
            </article>
          ))}
        </div>

        {/* footer — index count + back-to-top */}
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
          <span>Five of five</span>
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
        @media (min-width: 1024px) {
          .work-list-mobile { display: none !important; }
          .work-list-desktop { display: block; }
          .work-reveal-block { grid-template-columns: calc(330 * var(--px)) 1fr !important; align-items: start; }
        }
        @media (max-width: 1023px) {
          .work-list-desktop { display: none !important; }
          .work-list-mobile { display: block !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .work-reveal-block { transition: none !important; }
          .tilt-shift-inner { filter: none !important; }
        }
      `}</style>
    </section>
  );
}
