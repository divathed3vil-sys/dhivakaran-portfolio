'use client';

import { useEffect, useRef, useState } from 'react';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';
import { usePortfolioData, getImagesForCategory, lowResUrl } from './lib/use-portfolio-data';
import {
  PORTFOLIO_IMAGES,
  CATEGORY_LABELS,
  type ImageCategory,
  type PortfolioImage,
} from './lib/portfolio-images';
import { MediaViewer, type MediaItem } from './media-viewer';

const CATEGORY_ORDER: ImageCategory[] = ['book', 'poster', 'thumbnail'];

const CATEGORY_BLURBS: Record<string, string> = {
  book: 'Cover designs and key art for printed and digital books.',
  poster: 'Poster designs - print, key art, and promotional.',
  thumbnail: 'Youtube thumbnails - click-through composition.',
};

// Placeholder cells for categories that don't have real uploads yet.
const PLACEHOLDER_SRCS = PORTFOLIO_IMAGES.filter((i) => i.category === 'other');

function getCellsForCategory(cat: ImageCategory, catLabel: string): PortfolioImage[] {
  const real = PORTFOLIO_IMAGES.filter((i) => i.category === cat);
  if (real.length > 0) return real;
  return PLACEHOLDER_SRCS.slice(0, 3).map((img, i) => ({
    ...img,
    label: `${catLabel.replace(/s$/, '')} 0${i + 1}`,
  }));
}

// Phase 5b.4 — cell data type for the hover preview card.
type CellData = {
  src: string;
  fullSrc: string;
  lqipData: string;
  label: string;
  desc: string;
  processVideoUrl: string;
  processImageUrl: string;
  previewOrder: string[];
};


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
  // Phase 5b.4 — hover preview state. Stores the full cell data (desc + process
  // video + process image + preview_order) so the hover card can render all
  // items in the user-defined order. Null when not hovering over a cell.
  const [hoverCell, setHoverCell] = useState<CellData | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  // Phase 5b.3 — MediaViewer replaces the old ImageLightbox. Manages the
  // current viewer index (null = closed). Items list built from the current
  // category's cells, so prev/next navigates within the same category.
  const [viewerCatKey, setViewerCatKey] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Use Supabase data if available; fall back to hardcoded placeholders
  const useDb = dbCats && dbCats.length > 0;
  const displayCats = useDb
    ? dbCats!.map((c) => ({ key: c.id, name: c.name, blurb: c.blurb || '', cells: getImagesForCategory(dbImgs || [], c.id).map((img) => ({
        src: lowResUrl(img.public_url),        // 400px medium for cell thumbnail
        fullSrc: lowResUrl(img.public_url, 1920), // 1920px full for MediaViewer
        lqipData: img.lqip_data || '',         // Phase 5b.5 — 16px base64 LQIP
        label: img.label || '',
        desc: img.description || '',
        // Phase 5b.4 — process media for hover preview + MediaViewer sidebar
        processVideoUrl: img.process_video_url || '',
        processImageUrl: img.process_image_url || '',
        previewOrder: img.preview_order || ['description', 'video', 'image'],
      })) }))
    : CATEGORY_ORDER.map((cat) => {
        const cells = getCellsForCategory(cat, CATEGORY_LABELS[cat]);
        return { key: cat, name: CATEGORY_LABELS[cat], blurb: CATEGORY_BLURBS[cat], cells: cells.map((c) => ({ src: c.src, fullSrc: c.src, lqipData: '', label: c.label, desc: '', processVideoUrl: '', processImageUrl: '', previewOrder: ['description', 'video', 'image'] })) };
      });

  // Phase 5b.4 — hover preview: when cursor moves over a cell, look up the full
  // cell data (desc + process video + process image + preview_order) + set as
  // the hover state. The hover card renders items in the user-defined order.
  const handleMouseMove = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement)?.closest('[data-cell-idx]') as HTMLElement | null;
    if (el) {
      const idx = parseInt(el.dataset.cellIdx || '-1', 10);
      const catKey = el.dataset.catKey || '';
      const cat = displayCats.find((c) => c.key === catKey);
      if (cat && idx >= 0 && idx < cat.cells.length) {
        setHoverCell(cat.cells[idx]);
        setHoverPos({ x: e.clientX, y: e.clientY });
        return;
      }
    }
    if (hoverCell !== null) setHoverCell(null);
  };

  return (
    <>
    <section
      id="work"
      data-canvas="home"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverCell(null)}
      aria-label="Selected work"
      style={{
        background: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 150vh',
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
                      data-cell-idx={i}
                      data-cat-key={cat.key}
                      style={{
                        position: 'relative',
                        background: 'var(--night-soft)',
                        contain: 'layout paint',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Phase 5b.5 — LQIP blurred background. Renders instantly
                          (base64 inlined in JSON, zero HTTP requests). 16px wide,
                          scaled up + blurred to fill the cell as a placeholder.
                          Hidden once the main img finishes loading (faded in on top). */}
                      {cell.lqipData && (
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${cell.lqipData})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(20px)',
                            transform: 'scale(1.15)', // scale up to hide blur edges
                            zIndex: 0,
                          }}
                        />
                      )}
                      <img
                        src={cell.src}
                        alt={cell.label || ''}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={600}
                        onClick={() => { setViewerCatKey(cat.key); setViewerIndex(i); }}
                        onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          // Phase 5b.5 — start at opacity 0, fade in on onLoad (cross-fade with LQIP below).
                          // If no LQIP (legacy image), the img still loads + fades in — just shows solid bg briefly.
                          opacity: cell.lqipData ? 0 : 1,
                          filter: 'saturate(0.95) contrast(1.05) brightness(0.96)',
                          transition: 'filter 0.4s var(--ease-out-soft), opacity 0.4s var(--ease-out-soft)',
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          display: 'block',
                          userSelect: 'none',
                          WebkitUserDrag: 'none',
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

      {/* Phase 5b.4 — hover preview card. Follows cursor, shows description +
          process video (autoplay muted loop) + process image, in the
          user-defined preview_order. Items without data are skipped. */}
      {hoverCell && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(hoverPos.x + 16, window.innerWidth - 280)}px`,
            top: `${Math.min(hoverPos.y + 16, window.innerHeight - 200)}px`,
            maxWidth: '260px',
            maxHeight: '320px',
            overflow: 'hidden',
            padding: '0.75rem',
            background: 'rgba(10, 10, 10, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(214, 41, 41, 0.3)',
            color: 'var(--canvas)',
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: '0.85rem',
            lineHeight: 1.4,
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {/* Always show the label — even if no description or process media */}
          <div key="label" style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '0.95rem', color: 'var(--canvas)', marginBottom: '0.25rem' }}>
            {hoverCell.label || 'Untitled'}
          </div>
          {hoverCell.previewOrder.map((item) => {
            if (item === 'description' && hoverCell.desc) {
              return <div key="desc" style={{ fontSize: '0.8rem', opacity: 0.85 }}>{hoverCell.desc}</div>;
            }
            if (item === 'video' && hoverCell.processVideoUrl) {
              // Render the process video. If it's a YouTube/Vimeo URL, use iframe.
              // Otherwise, use a <video> element (for self-hosted .mp4/.webm).
              const isYT = /(?:youtube\.com|youtu\.be|vimeo\.com)/.test(hoverCell.processVideoUrl);
              return (
                <div key="video" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '2px' }}>
                  {isYT ? (
                    <iframe
                      src={hoverCell.processVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + (hoverCell.processVideoUrl.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&loop=1&modestbranding=1&rel=0'}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      allow="autoplay; encrypted-media"
                      title="Process video"
                    />
                  ) : (
                    <video
                      src={hoverCell.processVideoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
              );
            }
            if (item === 'image' && hoverCell.processImageUrl) {
              return (
                <div key="image" style={{ width: '100%', borderRadius: '2px', overflow: 'hidden' }}>
                  <img
                    src={hoverCell.processImageUrl}
                    alt="Process — Photoshop layers"
                    draggable={false}
                    style={{ width: '100%', display: 'block', userSelect: 'none', WebkitUserDrag: 'none' }}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Phase 5b.3 — MediaViewer replaces the old ImageLightbox. Slides in
          from the right, full-screen, magazine layout. Prev/next navigates
          within the current category. */}
      {viewerIndex !== null && viewerCatKey && (() => {
        const cat = displayCats.find((c) => c.key === viewerCatKey);
        if (!cat) return null;
        const items: MediaItem[] = cat.cells.map((cell) => ({
          id: cell.src,
          type: 'image' as const,
          src: cell.fullSrc || cell.src,
          label: cell.label || '',
          description: cell.desc || '',
          // Phase 5b.4 — pass process media to the MediaViewer sidebar
          processVideoUrl: cell.processVideoUrl || undefined,
          processImageUrl: cell.processImageUrl || undefined,
        }));
        return (
          <MediaViewer
            items={items}
            currentIndex={viewerIndex}
            onClose={() => { setViewerIndex(null); setViewerCatKey(null); }}
            onNavigate={(i) => setViewerIndex(i)}
          />
        );
      })()}
    </>
  );
}
