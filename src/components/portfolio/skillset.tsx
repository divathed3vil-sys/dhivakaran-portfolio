'use client';

import { useEffect, useRef, useState } from 'react';

type Skill = {
  index: string;
  title: string;
  category: string;
  description: string;
  rotation: number;
  offsetX: number;
  offsetY: number;
};

const SKILLS: Skill[] = [
  {
    index: '01',
    title: 'Brand Design',
    category: 'IDENTITY · NAMING · VOICE',
    description:
      'Logotypes, identity systems, naming, tone. From the first mark to the hundredth touchpoint.',
    rotation: -1.2,
    offsetX: -8,
    offsetY: 6,
  },
  {
    index: '02',
    title: 'Product Design',
    category: 'UX · UI · SYSTEMS',
    description:
      'Interfaces, component libraries, design tokens, the quiet mechanics of how a product breathes.',
    rotation: 0.8,
    offsetX: 12,
    offsetY: -4,
  },
  {
    index: '03',
    title: 'Art Direction',
    category: 'CAMPAIGNS · EDITORIAL · IMAGE',
    description:
      'Campaigns, editorial photography, image-making. Holding the whole frame together.',
    rotation: -0.6,
    offsetX: 4,
    offsetY: 8,
  },
  {
    index: '04',
    title: 'Motion & 3D',
    category: 'TITLES · MICRO-MOTION · SCENE',
    description:
      'Title sequences, micro-interactions, scene work. The rhythm between frames.',
    rotation: 1.4,
    offsetX: -10,
    offsetY: 0,
  },
  {
    index: '05',
    title: 'Creative Coding',
    category: 'WEBGL · GENERATIVE · INTERACTION',
    description:
      'Shaders, generative systems, interaction. Code as a brush, not a hammer.',
    rotation: -1.0,
    offsetX: 6,
    offsetY: -6,
  },
  {
    index: '06',
    title: 'Editorial',
    category: 'PRINT · TYPE · BOOKS',
    description:
      'Books, magazines, type setting, paper. The slow medium where every millimetre counts.',
    rotation: 0.5,
    offsetX: -4,
    offsetY: 10,
  },
  {
    index: '07',
    title: 'Sound Design',
    category: 'SCORE · FOLEY · IDENTITY',
    description:
      'Score, foley, audio identity. Sound is the other half of the frame.',
    rotation: -0.8,
    offsetX: 10,
    offsetY: 4,
  },
  {
    index: '08',
    title: 'Strategy',
    category: 'POSITIONING · NARRATIVE · RESEARCH',
    description:
      'Positioning, narrative, research. The work that happens before the work.',
    rotation: 1.1,
    offsetX: -6,
    offsetY: -8,
  },
  {
    index: '09',
    title: 'Production',
    category: 'DIRECTION · CASTING · SETS',
    description:
      'Direction, casting, set design. Making the room where the image can happen.',
    rotation: -0.4,
    offsetX: 8,
    offsetY: 6,
  },
];

/**
 * Skillset — "the developing room" specimen wall.
 *
 * Inventions:
 *  - NOT a table. Skills are pinned to a dark curator's wall as specimen cards
 *    in an intentionally disordered grid (rotations ±1.5°, hand-pinned offsets)
 *  - Each card "develops" on entry: exposure meter fills light→brass→dark,
 *    card sharpens from blur to focus (the unifying developing-room metaphor)
 *  - Anamorphic lens flare sweeps each card on hover (cinematic, brass)
 *  - Etched index, Fraunces title, brass-mono category, ink-stain exposure meter
 *  - Placeholder skills — user swaps in real ones later
 */
export function Skillset() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [exposedCards, setExposedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (entry.isIntersecting) {
            setExposedCards((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
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

  return (
    <section
      id="skillset"
      ref={sectionRef}
      data-canvas="home"
      className="night-active"
      style={{
        background: 'var(--night)',
        color: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="Skillset — the developing room"
    >
      {/* ambient brass glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60vw',
          height: '60vw',
          maxWidth: '900px',
          maxHeight: '900px',
          background:
            'radial-gradient(circle, rgba(184, 153, 104, 0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div className="canvas-max" style={{ position: 'relative' }}>
        {/* eyebrow */}
        <div
          className="text-label"
          style={{
            color: 'var(--night-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: 'calc(28 * var(--px))',
          }}
        >
          <span style={{ display: 'inline-block', width: '24px', height: '1.5px', background: 'var(--night-muted)' }} />
          ( THE SKILLSET — A DEVELOPING ROOM )
        </div>

        {/* title */}
        <h2
          className="text-section"
          style={{
            color: 'var(--canvas)',
            margin: 0,
            maxWidth: '14ch',
          }}
        >
          The Cabinet
          <br />
          <em
            style={{
              fontStyle: 'italic',
              fontWeight: 300,
              color: 'var(--brass-soft)',
            }}
          >
            of nine
          </em>
        </h2>

        <hr
          className="hairline-night"
          style={{ margin: 'calc(38 * var(--px)) 0 calc(54 * var(--px))' }}
        />

        {/* specimen grid — intentionally disordered */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 'calc(28 * var(--px))',
          }}
        >
          {SKILLS.map((skill, i) => {
            const exposed = exposedCards.has(i);
            return (
              <article
                key={skill.index}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-idx={i}
                className="specimen-card"
                style={{
                  position: 'relative',
                  background: 'var(--bone-soft)',
                  color: 'var(--ink)',
                  padding: 'calc(28 * var(--px))',
                  transform: `rotate(${skill.rotation}deg) translate(${skill.offsetX}px, ${skill.offsetY}px)`,
                  transition:
                    'transform 0.7s var(--ease-reveal), opacity 0.7s var(--ease-opacity), filter 0.7s var(--ease-reveal)',
                  opacity: exposed ? 1 : 0,
                  filter: exposed ? 'blur(0px)' : 'blur(10px)',
                  boxShadow: exposed
                    ? '0 18px 40px -12px rgba(0,0,0,0.6), 0 2px 0 rgba(184,153,104,0.18)'
                    : '0 4px 12px -8px rgba(0,0,0,0.4)',
                  cursor: 'default',
                  overflow: 'hidden',
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget;
                  const flare = card.querySelector('[data-flare]') as HTMLElement | null;
                  if (flare) {
                    flare.style.animation = 'none';
                    // force reflow
                    void flare.offsetWidth;
                    flare.style.animation = 'flare-sweep 0.9s var(--ease-out-soft)';
                  }
                }}
              >
                {/* etched index */}
                <div
                  className="text-mono text-label"
                  style={{
                    color: 'var(--brass)',
                    opacity: 0.85,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span>N° {skill.index}</span>
                  <span style={{ opacity: 0.5 }}>SPECIMEN</span>
                </div>

                {/* skill title */}
                <h3
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: 'calc(20 * var(--px)) 0 calc(8 * var(--px))',
                  }}
                >
                  {skill.title}
                </h3>

                {/* category */}
                <div
                  className="text-mono text-label"
                  style={{
                    color: 'var(--oxblood)',
                    marginBottom: 'calc(16 * var(--px))',
                  }}
                >
                  {skill.category}
                </div>

                {/* description */}
                <p
                  className="text-body"
                  style={{
                    color: 'var(--muted)',
                    maxWidth: '46ch',
                    margin: 0,
                  }}
                >
                  {skill.description}
                </p>

                {/* exposure meter — vertical ink-stain gradient */}
                <div
                  style={{
                    marginTop: 'calc(20 * var(--px))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span
                    className="text-mono text-label"
                    style={{ color: 'var(--muted)', opacity: 0.7 }}
                  >
                    EXPOSURE
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
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
                          'linear-gradient(90deg, var(--brass-soft), var(--brass), var(--oxblood))',
                        transition: 'width 1.2s var(--ease-reveal)',
                        transitionDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span
                    className="text-mono text-label"
                    style={{ color: 'var(--brass)', opacity: 0.85 }}
                  >
                    {exposed ? '◉' : '○'}
                  </span>
                </div>

                {/* anamorphic flare — sweeps on hover */}
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
                      'linear-gradient(90deg, transparent, rgba(184, 153, 104, 0.35), transparent)',
                    transform: 'translateX(-120%) skewX(-15deg)',
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                />

                {/* corner pin — hand-pinned feel */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--brass)',
                    opacity: 0.4,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                />
              </article>
            );
          })}
        </div>

        {/* footer note */}
        <div
          className="text-label"
          style={{
            color: 'var(--night-muted)',
            marginTop: 'calc(54 * var(--px))',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderTop: '1.5px solid var(--night-hr)',
            paddingTop: 'calc(20 * var(--px))',
          }}
        >
          <span>( PLACEHOLDERS — REAL SKILLSET INCOMING )</span>
          <span>NINE OF NINE · ALL EXPOSED</span>
        </div>
      </div>
    </section>
  );
}
