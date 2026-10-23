'use client';

import { useRef } from 'react';
import { WaveText } from './wave-text';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

const ABOUT_PARAGRAPH =
  'Hi, I\u2019m Diva - a graphic designer and video editor who enjoys turning ideas into visuals with a little personality. From graphic design and visual identities to video edits, motion, VFX and 3D, I like exploring different ways to tell a story and make an idea come to life. I enjoy experimenting, getting a little carried away with the details, and making things that feel just right.';

const STANDOUT_LINE = 'Your vision, my creativity - let\u2019s make it real.';

/**
 * About — sticky-travel paragraph with scroll-wave developing text.
 * Minimal: title, portrait, paragraph, standout line, signature.
 * (Collaborator/marquee section removed per user request.)
 */
export function About() {
  const travelRef = useRef<HTMLDivElement>(null);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();

  return (
    <section
      id="about"
      data-canvas="home"
      style={{
        background: 'var(--canvas)',
        position: 'relative',
      }}
    >
      {/* sticky travel wrapper — 200vh. Paragraph pins while WaveText develops. */}
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
              A little
              <br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--muted)' }}>about me</em>
            </h2>

            {/* paragraph with floating portrait insert */}
            <div style={{ position: 'relative', maxWidth: 'calc(1129 * var(--px))' }}>
              {/* floating portrait insert — about.png */}
              <div
                className="halftone"
                style={{
                  float: 'left',
                  width: '19%',
                  minWidth: '120px',
                  maxWidth: '220px',
                  aspectRatio: '1 / 1',
                  margin: '0.35rem 1.5rem 0.5rem 0',
                  backgroundImage: 'url(/images/about-med.webp)',
                  backgroundSize: 'cover',
                  backgroundPosition: '50% 35%',
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

            {/* standout line — separated + outstanding */}
            <div
              style={{
                marginTop: 'calc(48 * var(--px))',
                paddingTop: 'calc(28 * var(--px))',
                borderTop: '1.5px solid var(--rule)',
                maxWidth: 'calc(1129 * var(--px))',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontSize: 'clamp(1.5rem, 3.5vw, 2.75rem)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                Your vision, my creativity{' '}
                <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                  - let’s make it real.
                </span>
              </p>
            </div>

            {/* signature — hyphen, not em-dash */}
            <div
              style={{
                marginTop: 'calc(32 * var(--px))',
                fontFamily: 'var(--font-fraunces), serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                color: 'var(--muted)',
                letterSpacing: '-0.02em',
              }}
            >
              - Diva
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
