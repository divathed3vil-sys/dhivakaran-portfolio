'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Smartphone, Mic, Brain, Palette, Database,
  Layout, Image as ImageIcon, Clapperboard, Sparkles, Wand2, Brush, PenTool, Music,
  Layers, Film, Aperture, SlidersHorizontal, Box, Frame,
  Code, AppWindow, Terminal, Cpu, Wrench, Settings, SmartphoneCharging,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { BokehField } from './bokeh-field';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';
import {
  getPublishedExperiencesByCategory,
  type Experience,
  type ExperienceCategory,
} from '@/lib/experiences-data';

// Curated icon registry — only icons we ship in the seed JSON are bundled.
// If a future Studio edit picks an unlisted icon, it falls back to Box.
const ICONS: Record<string, LucideIcon> = {
  Smartphone, Mic, Brain, Palette, Database,
  Layout, Image: ImageIcon, Clapperboard, Sparkles, Wand2, Brush, PenTool, Music,
  Layers, Film, Aperture, SlidersHorizontal, Box, Frame,
  Code, AppWindow, Terminal, Cpu, Wrench, Settings, SmartphoneCharging,
};

function ExperienceIcon({ name, ...props }: { name: string } & React.ComponentProps<LucideIcon>) {
  const Cmp = ICONS[name] || Box;
  return <Cmp {...props} />;
}

const PHASES: {
  id: ExperienceCategory;
  index: string;
  name: string;
  subtitle: string;
  gridTemplate: string;
  cardType: 'spotlight' | 'medium' | 'compact';
}[] = [
  {
    id: 'exposed',
    index: '01',
    name: 'EXPOSED',
    subtitle: 'Active Exposures · Currently Learning',
    gridTemplate: 'repeat(2, 1fr)',
    cardType: 'spotlight',
  },
  {
    id: 'development',
    index: '02',
    name: 'IN DEVELOPMENT',
    subtitle: 'Practical & Hands-On Workflows',
    gridTemplate: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
    cardType: 'medium',
  },
  {
    id: 'fixed',
    index: '03',
    name: 'FIXED & PRINTED',
    subtitle: 'Completed & Past Foundations',
    gridTemplate: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
    cardType: 'compact',
  },
];

/**
 * Experiences — the "Developing Tray" 3-phase section.
 *
 * Data is statically imported at build time (src/data/experiences.json).
 * Zero runtime fetch for public visitors → perfect LCP + SEO.
 *
 * Three temporal phases mirroring darkroom process:
 *   01 / EXPOSED (Currently Learning) — wide spotlight cards, pulsing red dot
 *   02 / IN DEVELOPMENT (Practical Work) — medium 4-col grid
 *   03 / FIXED & PRINTED (Completed) — compact contact-sheet tiles
 *
 * Visual language inherits from the old Skillset section (BokehField, dolly-zoom,
 * bloom, hairline-night, anamorphic flare, spring easings) but restructured into
 * a vertical timeline rail + adaptive density per phase.
 */
export function Experiences() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();
  const [exposedCards, setExposedCards] = useState<Set<string>>(new Set());
  const [forceAll, setForceAll] = useState(false);

  // Dolly-zoom on section entry (matches Skillset pattern)
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

  // Expose cards on entry (individual) + 1.5s safety timeout (force-expose all)
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
      { threshold: 0.2 }
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    const safety = setTimeout(() => setForceAll(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  const data = getPublishedExperiencesByCategory();

  // Build a flat list of all visible experiences for stable flatIndex (same
  // pattern as the old Skillset — stable ref indexing, no closure mutation)
  const allExperiences: { exp: Experience; flatIndex: number; phaseIndex: number }[] = [];
  let flatIdx = 0;
  PHASES.forEach((phase, phaseIdx) => {
    data[phase.id].forEach((exp) => {
      allExperiences.push({ exp, flatIndex: flatIdx++, phaseIndex: phaseIdx });
    });
  });

  return (
    <section
      id="experiences"
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
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 100vh',
      }}
    >
      <BokehField count={8} />

      <div ref={bloomRef} data-dolly="" className="canvas-max" style={{ position: 'relative' }}>
        {/* Section header */}
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

        {/* Three-phase timeline rail + content */}
        <div style={{ position: 'relative', paddingLeft: 'calc(28 * var(--px))' }}>
          {/* Vertical timeline rail (left edge) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 'calc(20 * var(--px))',
              bottom: 0,
              width: '1.5px',
              background: 'var(--night-hr)',
            }}
          />

          {PHASES.map((phase, phaseIdx) => {
            const exps = data[phase.id];
            if (!exps.length) return null;
            return (
              <PhaseBlock
                key={phase.id}
                phase={phase}
                experiences={exps}
                phaseIdx={phaseIdx}
                cardRefs={cardRefs}
                exposedCards={exposedCards}
                forceAll={forceAll}
                flatOffset={
                  // Offset to the flatIndex of the first card in this phase
                  allExperiences.find((e) => e.exp.category === phase.id)?.flatIndex ?? 0
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- Phase block ----------

function PhaseBlock({
  phase,
  experiences,
  phaseIdx,
  cardRefs,
  exposedCards,
  forceAll,
  flatOffset,
}: {
  phase: typeof PHASES[number];
  experiences: Experience[];
  phaseIdx: number;
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  exposedCards: Set<string>;
  forceAll: boolean;
  flatOffset: number;
}) {
  return (
    <div
      style={{
        marginBottom: phaseIdx === PHASES.length - 1 ? 0 : 'calc(48 * var(--px))',
        position: 'relative',
      }}
    >
      {/* Tick on the rail at the phase header */}
      <div
        className="experiences-rail-tick"
        data-phase={phase.id}
        aria-hidden="true"
        style={{
          top: 'calc(20 * var(--px))',
          left: 'calc(-28 * var(--px) + -3.5px)', // align with rail line, slightly outside
        }}
      />

      {/* Phase header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.85rem',
          flexWrap: 'wrap',
          marginBottom: 'calc(20 * var(--px))',
        }}
      >
        <span
          className="text-mono text-label"
          style={{ color: 'var(--accent)', fontSize: 'clamp(0.75rem, 1vw, 0.875rem)' }}
        >
          {phase.index}{' //'}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: 'clamp(1.5rem, 3.2vw, 2.25rem)',
            letterSpacing: '-0.02em',
            color: 'var(--canvas)',
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          {phase.name}
        </h3>
        <span
          className="text-mono text-label"
          style={{ color: 'var(--night-muted)', opacity: 0.85 }}
        >
          {phase.subtitle}
        </span>
      </div>

      {/* Adaptive grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: phase.gridTemplate,
          gap: 'calc(24 * var(--px))',
          alignItems: 'stretch',
        }}
      >
        {experiences.map((exp, idx) => {
          const flatIndex = flatOffset + idx;
          const cardIdx = String(flatIndex + 1).padStart(2, '0');
          const key = `${phase.id}-${exp.id}`;
          const exposed = forceAll || exposedCards.has(key);
          return (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              cardIdx={cardIdx}
              cardType={phase.cardType}
              featured={exp.featured}
              exposed={exposed}
              flatIndex={flatIndex}
              cardRef={(el) => {
                cardRefs.current[flatIndex] = el;
              }}
              dataKey={key}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------- Card ----------

function ExperienceCard({
  exp,
  cardIdx,
  cardType,
  featured,
  exposed,
  flatIndex,
  cardRef,
  dataKey,
}: {
  exp: Experience;
  cardIdx: string;
  cardType: 'spotlight' | 'medium' | 'compact';
  featured: boolean;
  exposed: boolean;
  flatIndex: number;
  cardRef: (el: HTMLDivElement | null) => void;
  dataKey: string;
}) {
  const isSpotlight = cardType === 'spotlight';
  const isCompact = cardType === 'compact';

  // Slight rotation per card (analog feel) — matches old Skillset pattern
  const rotation = ((flatIndex * 17) % 100) / 100 * 1.6 - 0.8;

  // Per-phase icon color
  const iconColor =
    cardType === 'spotlight'
      ? 'var(--accent)'
      : cardType === 'medium'
      ? 'var(--canvas)'
      : 'var(--night-muted)';

  // Per-phase icon size
  const iconSize =
    isSpotlight ? 32 : isCompact ? 18 : 24;

  return (
    <article
      ref={cardRef}
      data-key={dataKey}
      data-featured={featured ? 'true' : 'false'}
      className={isCompact ? 'experiences-card experiences-card-compact' : 'experiences-card'}
      style={{
        position: 'relative',
        background: isSpotlight
          ? 'rgba(22, 22, 22, 0.6)'
          : 'var(--night-soft)',
        color: 'var(--canvas)',
        padding: isSpotlight
          ? 'calc(24 * var(--px))'
          : isCompact
          ? 'calc(16 * var(--px))'
          : 'calc(20 * var(--px))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: isSpotlight ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: isSpotlight ? 'blur(12px)' : 'none',
        // Spotlight cards span 2 columns when featured; otherwise 1
        gridColumn: isSpotlight && featured ? 'span 2' : 'span 1',
        transform: `rotate(${rotation}deg)`,
        opacity: exposed ? 1 : 0,
        filter: exposed ? 'blur(0px)' : 'blur(4px)',
        animation: exposed ? 'experiences-card-in 0.7s var(--ease-spring-medium) both' : 'none',
        animationDelay: `${flatIndex * 35}ms`,
        boxShadow: exposed
          ? '0 12px 32px -10px rgba(0,0,0,0.5)'
          : '0 4px 12px -8px rgba(0,0,0,0.4)',
        cursor: 'default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(12 * var(--px))',
      }}
    >
      {/* Top row: index + featured star (spotlight only) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <span className="experiences-card-index" style={{ color: 'var(--accent)', opacity: 0.85 }}>
          N° {cardIdx}
        </span>
        {isSpotlight && featured && (
          <Star
            size={14}
            className="experiences-featured-star"
            strokeWidth={1.5}
            aria-label="Featured"
          />
        )}
      </div>

      {/* Icon + title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'calc(12 * var(--px))',
        }}
      >
        <ExperienceIcon
          name={exp.icon}
          size={iconSize}
          strokeWidth={cardType === 'compact' ? 1 : 1.5}
          color={iconColor}
          style={{ flexShrink: 0, marginTop: isSpotlight ? '0.15rem' : '0.1rem' }}
          aria-hidden="true"
        />
        <h4
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: isSpotlight
              ? 'clamp(1.3rem, 2.5vw, 2.1rem)'
              : isCompact
              ? 'clamp(1rem, 1.8vw, 1.25rem)'
              : 'clamp(1.1rem, 2vw, 1.5rem)',
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            color: 'var(--canvas)',
            margin: 0,
            flex: 1,
          }}
        >
          {exp.title}
        </h4>
      </div>

      {/* Status badge */}
      <div
        className="text-mono text-label"
        style={{
          color: 'var(--night-muted)',
          opacity: 0.9,
        }}
      >
        {exp.status}
      </div>

      {/* Description */}
      {!isCompact && (
        <p
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 'clamp(0.9rem, 1.05vw, 1rem)',
            lineHeight: 1.55,
            color: 'var(--night-body)',
            margin: 0,
            // Clamp to 3 lines on spotlight, 2 on medium
            display: '-webkit-box',
            WebkitLineClamp: isSpotlight ? 3 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {exp.description}
        </p>
      )}

      {/* Tags (spotlight + medium only — compact has no room) */}
      {!isCompact && exp.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'calc(6 * var(--px))',
            marginTop: 'auto',
            paddingTop: 'calc(4 * var(--px))',
          }}
        >
          {exp.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="experiences-tag-pill">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Anamorphic flare on hover (overlay) */}
      <div className="experiences-flare" aria-hidden="true" />
    </article>
  );
}
