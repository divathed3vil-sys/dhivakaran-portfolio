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

/**
 * ImageLightbox — Phase 5b fix. A proper full-screen front layer with:
 *  - Body scroll lock (no background scrolling while open)
 *  - Image always centered (flexbox) with maxWidth/maxHeight 90vw/90vh
 *  - Zoom in/out via mouse wheel (1x to 5x range) — uses non-passive wheel
 *    listener so preventDefault actually works (React onWheel is passive by
 *    default in React 19 — can't block background scroll)
 *  - Drag-to-pan when zoomed in (mouse drag updates translate)
 *  - Click on background (not on image) closes
 *  - ESC closes, + / − zoom, 0 resets
 *  - Zoom controls: + / − / reset / close
 */
function ImageLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Lock body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC closes, + / − zoom, 0 resets
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.5));
      else if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(1, z - 0.5));
      else if (e.key === '0') { setZoom(1); setTranslate({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Non-passive wheel listener so preventDefault actually blocks background scroll.
  // React's onWheel is passive by default — can't preventDefault.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoom((z) => Math.max(1, Math.min(5, z + delta)));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Reset translate when zoom returns to 1 — handled in the wheel/keyboard
  // handlers directly (where setZoom is called) rather than via effect.

  // Drag-to-pan when zoomed in
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.lastX;
      const dy = e.clientY - dragState.current.lastY;
      dragState.current.lastX = e.clientX;
      dragState.current.lastY = e.clientY;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
    };
    const onMouseUp = () => {
      if (dragState.current.dragging) {
        dragState.current.dragging = false;
        setIsDragging(false);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onBackgroundClick = (e: React.MouseEvent) => {
    // Only close if click is on the overlay (not on the image)
    if (e.target === e.currentTarget) onClose();
  };

  const onImageMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    setIsDragging(true);
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={onBackgroundClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt={label}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={onImageMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${zoom})`,
          transition: zoom === 1 ? 'transform 0.3s var(--ease-spring-soft)' : 'none',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          userSelect: 'none',
          WebkitUserDrag: 'none',
        }}
      />
      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem', zIndex: 2 }}>
        <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }} onContextMenu={(e) => e.preventDefault()} style={ctrlBtnStyle} title="Zoom out (-)">−</button>
        <button onClick={(e) => { e.stopPropagation(); setZoom(1); setTranslate({ x: 0, y: 0 }); }} onContextMenu={(e) => e.preventDefault()} style={{ ...ctrlBtnStyle, minWidth: '50px' }} title="Reset (0)">{Math.round(zoom * 100)}%</button>
        <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(5, z + 0.5)); }} onContextMenu={(e) => e.preventDefault()} style={ctrlBtnStyle} title="Zoom in (+)">+</button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} onContextMenu={(e) => e.preventDefault()} style={{ ...ctrlBtnStyle, borderColor: 'var(--accent)', color: 'var(--accent)' }} title="Close (Esc)">✕</button>
      </div>
      {/* Bottom hint */}
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', color: 'var(--canvas)', opacity: 0.4, fontSize: '0.75rem', fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.1em', textTransform: 'uppercase', pointerEvents: 'none', textAlign: 'center' }}>
        scroll or + / − to zoom · drag to pan when zoomed · esc to close
      </div>
    </div>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10,10,10,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px',
  color: 'var(--canvas)',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background 0.2s, border-color 0.2s',
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
  const [descText, setDescText] = useState<string | null>(null);
  const [descPos, setDescPos] = useState({ x: 0, y: 0 });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxLabel, setLightboxLabel] = useState<string>('');

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
                      style={{
                        background: 'var(--night-soft)',
                        contain: 'layout paint',
                      }}
                    >
                      <img
                        src={cell.src}
                        alt={cell.label || ''}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={600}
                        onClick={() => { setLightboxSrc(cell.src); setLightboxLabel(cell.label || ''); }}
                        style={{
                          filter: 'saturate(0.95) contrast(1.05) brightness(0.96)',
                          transition: 'filter 0.4s var(--ease-out-soft)',
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

      {/* Phase 5b fix — proper ImageLightbox component (full overlay + zoom + drag + scroll lock) */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          label={lightboxLabel}
          onClose={() => { setLightboxSrc(null); setLightboxLabel(''); }}
        />
      )}
    </section>
  );
}
