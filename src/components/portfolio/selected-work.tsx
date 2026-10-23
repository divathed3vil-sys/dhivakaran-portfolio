'use client';

import { useBloom, useHeadingRack } from './lib/use-bloom-rack';
import { usePortfolioData, getImagesForCategory, lowResUrl } from './lib/use-portfolio-data';
import {
  PORTFOLIO_IMAGES,
  CATEGORY_LABELS,
  type ImageCategory,
  type PortfolioImage,
} from './lib/portfolio-images';

const CATEGORY_ORDER: ImageCategory[] = ['book', 'poster', 'thumbnail'];

const CATEGORY_BLURBS: Record<string, string> = {
  book: 'Cover designs and key art for printed and digital books.',
  poster: 'Poster designs - print, key art, and promotional.',
  thumbnail: 'Youtube thumbnails - click-through composition.',
};

// Placeholder cells for categories that don't have real uploads yet.
// Uses 'other' images as teasers. When real images are added to
// PORTFOLIO_IMAGES with the right category, they replace these.
const PLACEHOLDER_SRCS = PORTFOLIO_IMAGES.filter((i) => i.category === 'other');

function getCellsForCategory(cat: ImageCategory, catLabel: string): PortfolioImage[] {
  const real = PORTFOLIO_IMAGES.filter((i) => i.category === cat);
  if (real.length > 0) return real;
  // placeholders — 3 teaser cells using 'other' images
  return PLACEHOLDER_SRCS.slice(0, 3).map((img, i) => ({
    ...img,
    label: `${catLabel.replace(/s$/, '')} 0${i + 1}`,
  }));
}

/**
 * SelectedWork — three category grids (Book Covers, Posters, Thumbnails).
 * Pulls from the shared PORTFOLIO_IMAGES list. Images shown at their own
 * ratio (no crop — background-size: contain). When real work is added to
 * portfolio-images.ts, it appears here AND in the Visual Lab automatically.
 */
export function SelectedWork() {
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();
  const { categories: dbCats, images: dbImgs } = usePortfolioData();

  // Use Supabase data if available; fall back to hardcoded placeholders
  const useDb = dbCats && dbCats.length > 0;
  const displayCats = useDb
    ? dbCats!.map((c) => ({ key: c.id, name: c.name, blurb: c.blurb || '', cells: getImagesForCategory(dbImgs || [], c.id).map((img) => ({ src: lowResUrl(img.public_url), label: img.label || '' })) }))
    : CATEGORY_ORDER.map((cat) => {
        const cells = getCellsForCategory(cat, CATEGORY_LABELS[cat]);
        return { key: cat, name: CATEGORY_LABELS[cat], blurb: CATEGORY_BLURBS[cat], cells: cells.map((c) => ({ src: c.src, label: c.label })) };
      });

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

          {displayCats.map((cat) => {
            const isPlaceholder = !useDb;
            return (
              <div key={cat.key} style={{ marginBottom: 'calc(56 * var(--px))' }}>
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

                <div className="contact-sheet-grid">
                  {cat.cells.map((cell, i) => (
                    <article
                      key={`${cat.key}-${i}`}
                      className="contact-sheet-cell halftone scratch-host"
                      tabIndex={0}
                      style={{ background: 'var(--night-soft)' }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url(${cell.src})`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          filter: 'grayscale(1) contrast(1.1) brightness(0.88)',
                          transition: 'filter 0.4s var(--ease-out-soft)',
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
                      {isPlaceholder && (
                        <div
                          className="text-mono text-label"
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            color: 'var(--canvas)',
                            background: 'rgba(10, 10, 10, 0.6)',
                            padding: '2px 6px',
                            opacity: 0.7,
                            zIndex: 2,
                          }}
                        >
                          placeholder
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
