'use client';

import { useState } from 'react';
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
  const [descText, setDescText] = useState<string | null>(null);
  const [descPos, setDescPos] = useState({ x: 0, y: 0 });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // floating description card — follows cursor, shows on hover over cells with data-desc
  const handleMouseMove = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement)?.closest('[data-desc]') as HTMLElement | null;
    const desc = el?.dataset.desc;
    if (desc) {
      setDescText(desc);
      setDescPos({ x: e.clientX, y: e.clientY });
    } else if (descText !== null) {
      setDescText(null);
    }
  };

  // Use Supabase data if available; fall back to hardcoded placeholders
  const useDb = dbCats && dbCats.length > 0;
  const displayCats = useDb
    ? dbCats!.map((c) => ({ key: c.id, name: c.name, blurb: c.blurb || '', cells: getImagesForCategory(dbImgs || [], c.id).map((img) => ({ src: lowResUrl(img.public_url), label: img.label || '', desc: img.description || '' })) }))
    : CATEGORY_ORDER.map((cat) => {
        const cells = getCellsForCategory(cat, CATEGORY_LABELS[cat]);
        return { key: cat, name: CATEGORY_LABELS[cat], blurb: CATEGORY_BLURBS[cat], cells: cells.map((c) => ({ src: c.src, label: c.label })) };
      });

  return (
    <section
      id="work"
      data-canvas="home"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setDescText(null)}
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
                      data-desc={cell.desc || ''}
                      style={{ background: 'var(--night-soft)' }}
                    >
                      <img
                        src={cell.src}
                        alt={cell.label || ''}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={600}
                        onClick={() => { setLightboxSrc(cell.src); setZoom(1); }}
                        style={{
                          filter: 'saturate(0.95) contrast(1.05) brightness(0.96)',
                          transition: 'filter 0.4s var(--ease-out-soft)',
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          display: 'block',
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

      {/* floating description card — follows cursor, semi-transparent */}
      {descText && (
        <div
          style={{
            position: 'fixed',
            left: `${descPos.x + 16}px`,
            top: `${descPos.y + 16}px`,
            maxWidth: '260px',
            padding: '0.75rem 1rem',
            background: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(214, 41, 41, 0.3)',
            color: 'var(--canvas)',
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: '0.9rem',
            lineHeight: 1.4,
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)',
          }}
        >
          {descText}
        </div>
      )}

      {/* Lightbox — click image to open, blur+dim bg, scroll to zoom, double-click/click outside to close */}
      {lightboxSrc && (
        <div
          onClick={() => { setLightboxSrc(null); setZoom(1); }}
          onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(1, Math.min(5, z + (e.deltaY < 0 ? 0.2 : -0.2)))); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightboxSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => { setLightboxSrc(null); setZoom(1); }}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.15s var(--ease-out-soft)',
              cursor: zoom > 1 ? 'grab' : 'zoom-in',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            }}
          />
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', color: 'var(--canvas)', opacity: 0.4, fontSize: '0.75rem', fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.1em', textTransform: 'uppercase', pointerEvents: 'none' }}>
            scroll to zoom · double-click to close
          </div>
        </div>
      )}
    </section>
  );
}
