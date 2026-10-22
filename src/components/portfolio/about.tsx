'use client';

import { useRef } from 'react';
import { WaveText } from './wave-text';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

const ABOUT_PARAGRAPH =
  'I work between brand systems and product surfaces, between art direction and the quiet mechanics of motion. Most days the studio is a developing room — a little dark, a little warm, a few prints hanging to dry. An idea walks in half-formed; I hold it under the light until it stops moving. Then we lay it down on paper. This is the slow part, the honest part, the part where a thing either becomes itself, or doesn\u2019t. There is no rush, but there is no pause either — the room is always open, and the next print is always somewhere on its way in.';

const COLLABORATORS = [
  'ATELIER NORTH',
  'KOVIL PRESS',
  'STUDIO MERIDIAN',
  'NIGHT SOIL CO.',
  'HALF-LIGHT FILMS',
  'PAPER & ASH',
  'COMMON WARE',
  'LONG ROOM',
];

/**
 * About — sticky-travel paragraph with scroll-wave developing text.
 * The paragraph pins while the 135vh wrapper scrolls past it; each character
 * develops from latent (light/dim) → brass flash → exposed ink.
 *
 * Inventions:
 *  - Sticky "perfect framing" — paragraph never moves while you scroll past
 *  - WaveText char-by-char reveal (light → dark)
 *  - NO vertical line on scroll (removed per user request)
 *  - Rotated portrait insert floating inside the text flow
 *  - "A little room to wander." handwritten-style aside
 *  - Two opposing brass-on-parchment collaborator marquees
 */
export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const travelRef = useRef<HTMLDivElement>(null);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();

  return (
    <section
      id="about"
      ref={sectionRef}
      data-canvas="home"
      style={{
        background: 'var(--canvas)',
        position: 'relative',
      }}
    >
      {/* sticky travel wrapper — 200vh on desktop. The paragraph pins
          here for 100vh of scroll while WaveText develops letter-by-letter. */}
      <div ref={travelRef} style={{ height: '200vh', position: 'relative' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div ref={bloomRef} className="canvas-max" style={{ width: '100%' }}>
            {/* title */}
            <h2
              ref={titleRef}
              className="text-section"
              style={{
                color: 'var(--ink)',
                margin: '0 0 calc(28 * var(--px))',
                maxWidth: '14ch',
              }}
            >
              A little room
              <br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--muted)' }}>to wander</em>
            </h2>

            {/* paragraph with floating portrait insert */}
            <div style={{ position: 'relative', maxWidth: 'calc(1129 * var(--px))' }}>
              {/* floating portrait insert — inside text flow */}
              <div
                className="halftone"
                style={{
                  float: 'left',
                  width: '19%',
                  minWidth: '120px',
                  maxWidth: '220px',
                  aspectRatio: '1 / 1',
                  margin: '0.35rem 1.5rem 0.5rem 0',
                  backgroundImage: 'url(/images/portrait.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: '70% 30%',
                  transform: 'rotate(-6deg)',
                  boxShadow: '0 18px 40px -12px rgba(10, 10, 10, 0.28)',
                  filter: 'saturate(0.7) contrast(1.08) brightness(0.92)',
                  shapeOutside: 'circle(50%)',
                  borderRadius: '2px',
                }}
                aria-hidden="true"
              />

              <WaveText
                text={ABOUT_PARAGRAPH}
                as="p"
                className="text-lead"
                rootRef={travelRef}
              />
            </div>

            {/* "A little room to wander." aside — handwritten italic */}
            <div
              style={{
                marginTop: 'calc(40 * var(--px))',
                display: 'flex',
                alignItems: 'baseline',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                The room is always open.
              </span>
              <span
                className="text-label"
                style={{ color: 'var(--muted)' }}
              >
                — 0250
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* hairline + collaborator marquees */}
      <div className="canvas-max" style={{ paddingBottom: 'calc(64 * var(--px))' }}>
        <hr className="hairline" style={{ margin: 0 }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'calc(24 * var(--px))',
            marginTop: 'calc(40 * var(--px))',
          }}
        >
          {/* label */}
          <div className="text-label" style={{ color: 'var(--muted)' }}>
            Clients &amp; Collaborations
          </div>

          {/* two opposing marquees */}
          <div
            className="marquee-wrapper"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              borderTop: '1.5px solid var(--rule)',
              borderBottom: '1.5px solid var(--rule)',
              paddingBlock: 'calc(18 * var(--px))',
            }}
          >
            <div className="marquee-track" style={{ gap: 'calc(52 * var(--px))' }}>
              {[...COLLABORATORS, ...COLLABORATORS].map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                    color: 'var(--ink)',
                    opacity: 0.5,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                  <span style={{ color: 'var(--brass)', marginLeft: 'calc(52 * var(--px))' }} aria-hidden="true">
                    ✦
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div
            className="marquee-wrapper"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              paddingBlock: 'calc(18 * var(--px))',
            }}
          >
            <div
              className="marquee-track reverse"
              style={{ gap: 'calc(52 * var(--px))' }}
            >
              {[...COLLABORATORS, ...COLLABORATORS].reverse().map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                    color: 'var(--ink)',
                    opacity: 0.5,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                  <span style={{ color: 'var(--brass)', marginLeft: 'calc(52 * var(--px))' }} aria-hidden="true">
                    ✦
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
