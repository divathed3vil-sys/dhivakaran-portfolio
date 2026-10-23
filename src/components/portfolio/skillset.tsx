'use client';

import { useEffect, useRef, useState } from 'react';
import { BokehField } from './bokeh-field';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

type Group = {
  index: string;
  name: string;
  skills: string[];
};

const GROUPS: Group[] = [
  {
    index: '01',
    name: 'Software & Tools',
    skills: [
      'Adobe Photoshop',
      'Adobe Premiere Pro',
      'Adobe After Effects',
      'Adobe Illustrator',
      'DaVinci Resolve',
      'Blender',
      'Flutter & Supabase',
    ],
  },
  {
    index: '02',
    name: 'Graphic Design',
    skills: [
      'Poster Design',
      'YouTube Thumbnail Design',
      'Visual Composition',
      'Image Manipulation',
      'Digital Artwork & Creative Design',
    ],
  },
  {
    index: '03',
    name: 'Video & Post-Production',
    skills: [
      'Video Editing',
      'Motion Graphics',
      'Visual Effects (VFX)',
      'Sound Design',
      'Color Grading',
      'Audio Editing & Synchronization',
    ],
  },
  {
    index: '04',
    name: 'Programming & Development',
    skills: [
      'Basic Python Programming',
      'Basic Application Development',
      'Flutter App Development',
      'Backend Integration with Supabase',
      'AI-Assisted Coding',
    ],
  },
  {
    index: '05',
    name: 'Systems & Hardware',
    skills: [
      'Linux Operating Systems',
      'Computer Hardware Troubleshooting',
      'Laptop Repair & Maintenance',
      'Operating System Configuration',
      'Mobile Device Troubleshooting',
    ],
  },
];

/**
 * Experiences — five groups of skills across craft and code.
 * Slim specimen cards (index + title + group + exposure meter). 28 skills total.
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
      { threshold: 0.3 }
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

        <hr className="hairline-night" style={{ margin: '0 0 calc(48 * var(--px))' }} />

        {GROUPS.map((group) => (
          <div key={group.index} style={{ marginBottom: 'calc(40 * var(--px))' }}>
            {/* group label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.75rem',
                marginBottom: 'calc(18 * var(--px))',
              }}
            >
              <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>
                {group.index}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                  letterSpacing: '-0.02em',
                  color: 'var(--canvas)',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {group.name}
              </h3>
            </div>

            {/* slim cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: 'calc(12 * var(--px))',
              }}
            >
              {group.skills.map((skill) => {
                const idx = String(++globalIdx).padStart(2, '0');
                const key = `${group.index}-${skill}`;
                const exposed = exposedCards.has(key);
                const rotation = ((globalIdx * 17) % 100) / 100 * 2.5 - 1.25;
                return (
                  <article
                    key={key}
                    ref={(el) => {
                      cardRefs.current[globalIdx - 1] = el;
                    }}
                    data-key={key}
                    className="specimen-card"
                    style={{
                      position: 'relative',
                      background: 'var(--bone-soft)',
                      color: 'var(--ink)',
                      padding: 'calc(18 * var(--px))',
                      transform: `rotate(${rotation}deg)`,
                      transition:
                        'transform 0.7s var(--ease-reveal), opacity 0.7s var(--ease-opacity), filter 0.7s var(--ease-reveal)',
                      opacity: exposed ? 1 : 0,
                      filter: exposed ? 'blur(0px)' : 'blur(8px)',
                      boxShadow: exposed
                        ? '0 12px 28px -10px rgba(0,0,0,0.5), 0 2px 0 rgba(214,41,41,0.15)'
                        : '0 4px 12px -8px rgba(0,0,0,0.4)',
                      cursor: 'default',
                      overflow: 'hidden',
                      minHeight: '120px',
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
                      style={{ color: 'var(--accent)', opacity: 0.85 }}
                    >
                      N° {idx}
                    </div>

                    <h4
                      style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontWeight: 500,
                        fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
                        lineHeight: 1.15,
                        letterSpacing: '-0.015em',
                        color: 'var(--ink)',
                        margin: 'calc(8 * var(--px)) 0',
                      }}
                    >
                      {skill}
                    </h4>

                    {/* exposure meter — thin */}
                    <div
                      style={{
                        height: '2px',
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
                          transition: 'width 1s var(--ease-reveal)',
                        }}
                      />
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
                          'linear-gradient(90deg, transparent, rgba(214, 41, 41, 0.25), transparent)',
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
