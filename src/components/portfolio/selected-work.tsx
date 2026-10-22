'use client';

import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

type Category = {
  name: string;
  blurb: string;
  cells: { src: string; bgPos: string; label: string }[];
};

const IMAGES = ['/images/portrait.png', '/images/atmosphere.png', '/images/object-lens.png'];

const CATEGORIES: Category[] = [
  {
    name: 'Book Covers',
    blurb: 'Cover designs and key art for printed and digital books.',
    cells: [
      { src: IMAGES[1], bgPos: '20% 40%', label: 'Cover 01' },
      { src: IMAGES[2], bgPos: '50% 50%', label: 'Cover 02' },
      { src: IMAGES[0], bgPos: '50% 30%', label: 'Cover 03' },
      { src: IMAGES[1], bgPos: '70% 60%', label: 'Cover 04' },
    ],
  },
  {
    name: 'Posters',
    blurb: 'Poster designs - print, key art, and promotional.',
    cells: [
      { src: IMAGES[2], bgPos: '30% 70%', label: 'Poster 01' },
      { src: IMAGES[1], bgPos: '60% 30%', label: 'Poster 02' },
      { src: IMAGES[0], bgPos: '40% 50%', label: 'Poster 03' },
      { src: IMAGES[2], bgPos: '70% 40%', label: 'Poster 04' },
    ],
  },
  {
    name: 'Thumbnails',
    blurb: 'Youtube thumbnails - click-through composition.',
    cells: [
      { src: IMAGES[0], bgPos: '50% 25%', label: 'Thumbnail 01' },
      { src: IMAGES[1], bgPos: '30% 50%', label: 'Thumbnail 02' },
      { src: IMAGES[2], bgPos: '60% 60%', label: 'Thumbnail 03' },
    ],
  },
];

/**
 * SelectedWork — three category grids (Book Covers, Posters, Thumbnails).
 * Grid-only (accordion removed per user request). Placeholder covers; real
 * projects to be uploaded later.
 */
export function SelectedWork() {
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();

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
        <div ref={bloomRef}>
          <h2
            ref={titleRef}
            className="text-section"
            style={{
              color: 'var(--ink)',
              margin: '0 0 calc(38 * var(--px))',
              maxWidth: '14ch',
            }}
          >
            Selected{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--muted)' }}>
              frames
            </em>
          </h2>

          <hr className="hairline" style={{ margin: '0 0 calc(48 * var(--px))' }} />

          {CATEGORIES.map((cat) => (
            <div key={cat.name} style={{ marginBottom: 'calc(56 * var(--px))' }}>
              {/* category label + blurb */}
              <div style={{ marginBottom: 'calc(24 * var(--px))' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {cat.name}
                </h3>
                <p
                  className="text-body"
                  style={{ color: 'var(--muted)', margin: '0.5rem 0 0', maxWidth: '46ch' }}
                >
                  {cat.blurb}
                </p>
              </div>

              {/* grid of cells */}
              <div className="contact-sheet-grid">
                {cat.cells.map((cell, i) => (
                  <article
                    key={i}
                    className="contact-sheet-cell halftone scratch-host"
                    tabIndex={0}
                    style={{ background: 'var(--bone-soft)' }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cell.src})`,
                        backgroundSize: 'cover',
                        backgroundPosition: cell.bgPos,
                        filter: 'grayscale(1) contrast(1.1) brightness(0.88)',
                        transition: 'filter 0.4s var(--ease-out-soft), transform 0.4s var(--ease-out-soft)',
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
                        zIndex: 2,
                      }}
                    >
                      {cell.label}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
