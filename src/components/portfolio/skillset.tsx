'use client';

import { useEffect, useRef, useState } from 'react';
import { BokehField } from './bokeh-field';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

type Skill = {
  title: string;
  desc: string;
};

type Group = {
  name: string;
  skills: Skill[];
};

const GROUPS: Group[] = [
  {
    name: 'Software',
    skills: [
      { title: 'Photoshop', desc: 'Image manipulation, compositing, and graphic design.' },
      { title: 'Premiere Pro', desc: 'Video editing - cuts, pacing, color, story.' },
      { title: 'After Effects', desc: 'Motion graphics, VFX, and title sequences.' },
    ],
  },
  {
    name: 'Creative',
    skills: [
      { title: 'Poster Design', desc: 'Print and key art - layout, type, visual identity.' },
      { title: 'Thumbnail Design', desc: 'Youtube thumbnails - click-through composition.' },
      { title: 'Video Editing', desc: 'Cuts, rhythm, and story structure across formats.' },
      { title: 'Motion Graphics', desc: 'Animated type, lower-thirds, and scene transitions.' },
      { title: 'VFX', desc: 'Compositing, clean-up, and visual simulation.' },
      { title: 'Sound Design', desc: 'Score, foley, and audio identity.' },
    ],
  },
  {
    name: 'IT',
    skills: [
      {
        title: 'Programming & AI',
        desc: 'Python fundamentals, AI-assisted prototyping, Flutter/Dart exploration, and local AI (Ollama) setup.',
      },
      {
        title: 'Linux',
        desc: 'EndeavourOS, terminal configuration, desktop customization, and system troubleshooting.',
      },
    ],
  },
];

/**
 * Skillset — "Experiences". Three groups: Software, Creative, IT.
 * Specimen-card grid with exposure meters + anamorphic flare on hover.
 */
export function Skillset() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();
  const [exposedCards, setExposedCards] = useState<Set<string>>(new Set());

  // dolly-zoom on section entry
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section) return;
    const inner = section.querySelector('[data-dolly]');
    if (!inner) return;
    inner.setAttribute('data-dolly', 'pending');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.25) {
            inner.setAttribute('data-dolly', 'active');
            io.unobserve(section);
          }
        });
      },
      { threshold: [0, 0.25] }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // expose cards on entry
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = (entry.target as HTMLElement).dataset.key || '';
          if (entry.isIntersecting) {
            setExposedCards((prev) => {
              if (prev.has(key)) return prev;
              const next = new Set(prev);
              next.add(key);
              return next;
            });
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  let globalIdx = 0;

  return (
    <section
      id="skillset"
      ref={sectionRef}
      data-canvas="home"
      className="night-active"
      aria-label="Experiences"
      style={{
        background: 'var(--night)',
        color: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BokehField count={8} />

      <div ref={bloomRef} data-dolly="" className="canvas-max" style={{ position: 'relative' }}>
        <h2
          ref={titleRef}
          className="text-section"
          style={{
            color: 'var(--canvas)',
            margin: '0 0 calc(38 * var(--px))',
            maxWidth: '14ch',
          }}
        >
          Experiences
          <br />
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--accent-soft)' }}>
            across craft &amp; code
          </em>
        </h2>

        <hr
          className="hairline-night"
          style={{ margin: '0 0 calc(48 * var(--px))' }}
        />

        {GROUPS.map((group) => (
          <div key={group.name} style={{ marginBottom: 'calc(48 * var(--px))' }}>
            {/* group label */}
            <div
              className="text-mono text-label"
              style={{ color: 'var(--accent)', marginBottom: 'calc(20 * var(--px))' }}
            >
              {group.name}
            </div>

            {/* cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: 'calc(20 * var(--px))',
              }}
            >
              {group.skills.map((skill) => {
                const idx = String(++globalIdx).padStart(2, '0');
                const key = `${group.name}-${skill.title}`;
                const exposed = exposedCards.has(key);
                const rotation = ((globalIdx * 17) % 100) / 100 * 3 - 1.5;
                return (
                  <article
                    key={key}
                    ref={(el) => {
                      cardRefs.current[globalIdx - 1] = el;
                    }}
                    data-key={key}
                    data-idx={globalIdx - 1}
                    className="specimen-card"
                    style={{
                      position: 'relative',
                      background: 'var(--bone-soft)',
                      color: 'var(--ink)',
                      padding: 'calc(24 * var(--px))',
                      transform: `rotate(${rotation}deg)`,
                      transition:
                        'transform 0.7s var(--ease-reveal), opacity 0.7s var(--ease-opacity), filter 0.7s var(--ease-reveal)',
                      opacity: exposed ? 1 : 0,
                      filter: exposed ? 'blur(0px)' : 'blur(10px)',
                      boxShadow: exposed
                        ? '0 18px 40px -12px rgba(0,0,0,0.6), 0 2px 0 rgba(214,41,41,0.18)'
                        : '0 4px 12px -8px rgba(0,0,0,0.4)',
                      cursor: 'default',
                      overflow: 'hidden',
                      minHeight: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      const card = e.currentTarget;
                      const flare = card.querySelector('[data-flare]') as HTMLElement | null;
                      if (flare) {
                        flare.style.animation = 'none';
                        void flare.offsetWidth;
                        flare.style.animation = 'flare-sweep 0.9s var(--ease-out-soft)';
                      }
                    }}
                  >
                    <div
                      className="text-mono text-label"
                      style={{
                        color: 'var(--accent)',
                        opacity: 0.85,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>N° {idx}</span>
                      <span style={{ opacity: 0.5 }}>{group.name.toUpperCase()}</span>
                    </div>

                    <h3
                      style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontWeight: 500,
                        fontSize: 'clamp(1.4rem, 2.8vw, 2rem)',
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                        color: 'var(--ink)',
                        margin: 'calc(16 * var(--px)) 0 calc(8 * var(--px))',
                      }}
                    >
                      {skill.title}
                    </h3>

                    <p
                      className="text-body"
                      style={{ color: 'var(--muted)', maxWidth: '40ch', margin: 0 }}
                    >
                      {skill.desc}
                    </p>

                    {/* exposure meter */}
                    <div
                      style={{
                        marginTop: 'calc(20 * var(--px))',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <span className="text-mono text-label" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                        EXP
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '3px',
                          background: 'var(--rule)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: exposed ? '100%' : '0%',
                            background:
                              'linear-gradient(90deg, var(--accent-soft), var(--accent), var(--accent-deep))',
                            transition: 'width 1.2s var(--ease-reveal)',
                          }}
                        />
                      </div>
                      <span className="text-mono text-label" style={{ color: 'var(--accent)', opacity: 0.85 }}>
                        {exposed ? '◉' : '○'}
                      </span>
                    </div>

                    {/* anamorphic flare on hover */}
                    <div
                      data-flare=""
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: '40%',
                        background:
                          'linear-gradient(90deg, transparent, rgba(214, 41, 41, 0.3), transparent)',
                        transform: 'translateX(-120%) skewX(-15deg)',
                        opacity: 0,
                        pointerEvents: 'none',
                      }}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
