'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Aperture, Terminal, Layout, Image as ImageIcon, Clapperboard, Sparkles, Wand2,
  Brush, PenTool, Music, Frame, Palette, Mic, Smartphone, Brain, Database,
  Code, AppWindow, Cpu, Wrench, Settings, SmartphoneCharging, Box,
  type LucideIcon,
} from 'lucide-react';
import { BokehField } from './bokeh-field';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';
import {
  getExperiencesByCategory,
  getSoftwareIconUrl,
  getMasteryLabel,
  type Category,
  type Experience,
  type Software,
} from '@/lib/experiences-data';

// Curated lucide icon registry for experiences + category headers.
// Falls back to Box if an unknown icon name is encountered (defensive —
// the Studio IconPicker only allows valid names, but seed/migration
// data could have drift).
const ICONS: Record<string, LucideIcon> = {
  Aperture, Terminal, Layout, Image: ImageIcon, Clapperboard, Sparkles, Wand2,
  Brush, PenTool, Music, Frame, Palette, Mic, Smartphone, Brain, Database,
  Code, AppWindow, Cpu, Wrench, Settings, SmartphoneCharging, Box,
};

function ExperienceIcon({ name, ...props }: { name: string } & React.ComponentProps<LucideIcon>) {
  const Cmp = ICONS[name] || Box;
  return <Cmp {...props} />;
}

/**
 * Experiences v2 — "Developing Tray" by STREAM (not skill level).
 *
 * Schema v2 changes:
 *  - Categories are dynamic (admin-editable title/subtitle/order/icon).
 *  - Each category contains EXPERIENCES (disciplines like "Poster Design")
 *    AND SOFTWARE (tools like "Photoshop" with a mastery progress bar).
 *  - Software brand icons load from jsdelivr + simple-icons CDN (no Supabase).
 *
 * Layout per category block:
 *   ┌─ 01 // VISUAL PRODUCTION ───────────────────────┐
 *   │  [Aperture icon]  Image editing, motion, VFX  │
 *   │                                                 │
 *   │  EXPERIENCES (11)                              │
 *   │  [grid of cards: title + status + tags]        │
 *   │                                                 │
 *   │  SOFTWARE (6)                                  │
 *   │  [PS] Photoshop     █████████░ 92% Expert       │
 *   │  [Pr] Premiere Pro  ████████░░ 88% Advanced     │
 *   │  [Ae] After Effects ███████░░░ 78% Advanced     │
 *   │  ...                                           │
 *   └─────────────────────────────────────────────────┘
 *
 * Data is statically imported at build time → zero runtime fetch for public
 * visitors. Brand icons load from jsdelivr CDN (MIT, no API key, no Supabase).
 */
export function Experiences() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();
  const [exposedCards, setExposedCards] = useState<Set<string>>(new Set());
  const [forceAll, setForceAll] = useState(false);

  // Dolly-zoom on section entry (matches original Skillset pattern)
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

  // Expose cards on entry + safety timeout (force-expose after 1.5s)
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

  const data = getExperiencesByCategory();

  // Flat list across all categories for stable flatIndex (used in card rotation)
  const allExperiences: { exp: Experience; flatIndex: number; category: Category }[] = [];
  let flatIdx = 0;
  data.forEach(({ category, experiences }) => {
    experiences.forEach((exp) => {
      allExperiences.push({ exp, flatIndex: flatIdx++, category });
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

        {/* Category blocks (timeline rail + content) */}
        <div style={{ position: 'relative', paddingLeft: 'calc(28 * var(--px))' }}>
          {/* Vertical timeline rail */}
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

          {data.map(({ category, experiences, software }, phaseIdx) => (
            <CategoryBlock
              key={category.id}
              category={category}
              experiences={experiences}
              software={software}
              phaseIdx={phaseIdx}
              cardRefs={cardRefs}
              exposedCards={exposedCards}
              forceAll={forceAll}
              flatOffset={
                allExperiences.find((e) => e.exp.category_id === category.id)?.flatIndex ?? 0
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Category block (one per category) ----------

function CategoryBlock({
  category,
  experiences,
  software,
  phaseIdx,
  cardRefs,
  exposedCards,
  forceAll,
  flatOffset,
}: {
  category: Category;
  experiences: Experience[];
  software: Software[];
  phaseIdx: number;
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  exposedCards: Set<string>;
  forceAll: boolean;
  flatOffset: number;
}) {
  return (
    <div
      style={{
        marginBottom: phaseIdx === -1 ? 0 : 'calc(56 * var(--px))',
        position: 'relative',
      }}
    >
      {/* Tick on the rail */}
      <div
        className="experiences-rail-tick"
        data-phase={phaseIdx === 0 ? 'exposed' : 'development'}
        aria-hidden="true"
        style={{
          top: 'calc(20 * var(--px))',
          left: 'calc(-28 * var(--px) + -3.5px)',
        }}
      />

      {/* Category header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: 'calc(20 * var(--px))',
        }}
      >
        <span
          className="text-mono text-label"
          style={{
            color: 'var(--accent)',
            fontSize: 'clamp(0.75rem, 1vw, 0.875rem)',
          }}
        >
          {String(category.order).padStart(2, '0')}{' //'}
        </span>
        <ExperienceIcon
          name={category.icon}
          size={24}
          strokeWidth={1.5}
          color="var(--accent)"
          style={{ flexShrink: 0, alignSelf: 'center' }}
          aria-hidden="true"
        />
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
          {category.title}
        </h3>
        <span
          className="text-mono text-label"
          style={{ color: 'var(--night-muted)', opacity: 0.85, flexBasis: '100%' }}
        >
          {category.subtitle}
        </span>
      </div>

      {/* EXPERIENCES sub-section */}
      {experiences.length > 0 && (
        <div style={{ marginBottom: 'calc(28 * var(--px))' }}>
          <div
            className="text-mono text-label"
            style={{
              color: 'var(--night-muted)',
              marginBottom: 'calc(14 * var(--px))',
              opacity: 0.85,
            }}
          >
            EXPERIENCES ({experiences.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 'calc(16 * var(--px))',
              alignItems: 'stretch',
            }}
          >
            {experiences.map((exp, idx) => {
              const flatIndex = flatOffset + idx;
              const cardIdx = String(flatIndex + 1).padStart(2, '0');
              const key = `${category.id}-${exp.id}`;
              const exposed = forceAll || exposedCards.has(key);
              return (
                <ExperienceCard
                  key={exp.id}
                  exp={exp}
                  cardIdx={cardIdx}
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
      )}

      {/* SOFTWARE sub-section with progress bars */}
      {software.length > 0 && (
        <div>
          <div
            className="text-mono text-label"
            style={{
              color: 'var(--night-muted)',
              marginBottom: 'calc(14 * var(--px))',
              opacity: 0.85,
            }}
          >
            SOFTWARE ({software.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
              gap: 'calc(10 * var(--px))',
              alignItems: 'stretch',
            }}
          >
            {software.map((sw) => (
              <SoftwareCard key={sw.id} sw={sw} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Experience card (discipline, not skill-level) ----------

function ExperienceCard({
  exp,
  cardIdx,
  exposed,
  flatIndex,
  cardRef,
  dataKey,
}: {
  exp: Experience;
  cardIdx: string;
  exposed: boolean;
  flatIndex: number;
  cardRef: (el: HTMLDivElement | null) => void;
  dataKey: string;
}) {
  // Slight rotation per card (analog feel)
  const rotation = ((flatIndex * 17) % 100) / 100 * 1.6 - 0.8;

  return (
    <article
      ref={cardRef}
      data-key={dataKey}
      data-featured={exp.featured ? 'true' : 'false'}
      className="experiences-card"
      style={{
        position: 'relative',
        background: 'var(--night-soft)',
        color: 'var(--canvas)',
        padding: 'calc(18 * var(--px))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
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
        gap: 'calc(10 * var(--px))',
      }}
    >
      {/* Top row: index + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span className="experiences-card-index">N° {cardIdx}</span>
        <ExperienceIcon
          name={exp.icon}
          size={18}
          strokeWidth={1.5}
          color="var(--accent)"
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h4
        style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontWeight: 500,
          fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
          lineHeight: 1.15,
          letterSpacing: '-0.015em',
          color: 'var(--canvas)',
          margin: 0,
        }}
      >
        {exp.title}
      </h4>

      {/* Status */}
      <div
        className="text-mono text-label"
        style={{ color: 'var(--night-muted)', opacity: 0.9 }}
      >
        {exp.status}
      </div>

      {/* Description (clamped to 2 lines) */}
      <p
        style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 'clamp(0.85rem, 1vw, 0.95rem)',
          lineHeight: 1.5,
          color: 'var(--night-body)',
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {exp.description}
      </p>

      {/* Tags */}
      {exp.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'calc(5 * var(--px))',
            marginTop: 'auto',
            paddingTop: 'calc(2 * var(--px))',
          }}
        >
          {exp.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="experiences-tag-pill">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Anamorphic flare on hover */}
      <div className="experiences-flare" aria-hidden="true" />
    </article>
  );
}

// ---------- Software card with progress bar + CDN icon ----------

function SoftwareCard({ sw }: { sw: Software }) {
  const [iconError, setIconError] = useState(false);
  const mastery = getMasteryLabel(sw.progress);

  return (
    <div
      className="software-card"
      style={{
        padding: 'calc(12 * var(--px)) calc(14 * var(--px))',
        background: 'rgba(22, 22, 22, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(12 * var(--px))',
        transition: 'border-color 0.3s var(--ease-out-soft), background 0.3s var(--ease-out-soft)',
      }}
    >
      {/* Software brand icon — loads from jsdelivr + simple-icons CDN */}
      {/* MIT-licensed, no API key, no Supabase involvement */}
      <div
        style={{
          width: '28px',
          height: '28px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!iconError ? (
           
          <img
            src={getSoftwareIconUrl(sw.slug)}
            alt={`${sw.name} brand icon`}
            width={24}
            height={24}
            onError={() => setIconError(true)}
            // Brand icons are pure-black SVGs — invert to white for the dark section.
            // (brightness(0) sets all pixels to black, then invert(1) flips to white)
            style={{
              filter: 'brightness(0) invert(1)',
              opacity: 0.92,
              display: 'block',
            }}
            loading="lazy"
          />
        ) : (
          <Box size={20} strokeWidth={1.5} color="var(--night-muted)" aria-hidden="true" />
        )}
      </div>

      {/* Name + progress bar + mastery label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '0.5rem',
            marginBottom: 'calc(5 * var(--px))',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              fontSize: 'clamp(0.85rem, 1vw, 0.95rem)',
              color: 'var(--canvas)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sw.name}
          </span>
          <span
            className="text-mono text-label"
            style={{
              color: 'var(--accent)',
              opacity: 0.95,
              fontSize: 'clamp(0.65rem, 0.75vw, 0.7rem)',
              flexShrink: 0,
            }}
            aria-label={`${mastery}, ${sw.progress}% mastery`}
          >
            {sw.progress}%
          </span>
        </div>

        {/* Progress bar — thin red gradient on hairline track */}
        <div
          role="progressbar"
          aria-valuenow={sw.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${sw.name} mastery`}
          style={{
            height: '2px',
            background: 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${sw.progress}%`,
              background: 'linear-gradient(90deg, var(--accent-soft), var(--accent), var(--accent-deep))',
              transition: 'width 1.2s var(--ease-reveal)',
            }}
          />
        </div>

        {/* Mastery label (accessible text under the bar) */}
        <div
          className="text-mono text-label"
          style={{
            color: 'var(--night-muted)',
            opacity: 0.6,
            marginTop: 'calc(3 * var(--px))',
            fontSize: 'clamp(0.55rem, 0.65vw, 0.65rem)',
          }}
        >
          {mastery}
        </div>
      </div>
    </div>
  );
}
