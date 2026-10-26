'use client';

import { useEffect, useState } from 'react';

/**
 * MediaViewer — Phase 5b.3. A unified full-screen viewer for images AND videos.
 *
 * Design (informed by research — Linear, Apple, Vercel, Framer, Stripe):
 *  - Full-screen panel slides in from the RIGHT (transform: translateX(100%) → 0)
 *    with --ease-spring-medium (matches the existing Nav menu slide-in direction + feel).
 *  - Magazine layout on desktop: main media left (65%), sidebar right (35%) with
 *    process video + process image + description + metadata.
 *  - Stacked layout on mobile (main media on top, sidebar below).
 *  - Prev/Next navigation: arrow keys + on-screen arrows + mobile swipe.
 *  - Body scroll lock while open. ESC closes. Backdrop blur on the page behind.
 *  - Forward-compatible: process video/image sections render ONLY if the item
 *    has those URLs (they come in Phase 5b.4 — the hover preview system).
 */

export type MediaItem = {
  id: string;
  type: 'image' | 'video';
  src: string; // full-quality URL for image, embed URL for video
  label: string;
  description?: string;
  processVideoUrl?: string; // Phase 5b.4 — hover preview "how I did it" video
  processImageUrl?: string; // Phase 5b.4 — hover preview "how I did it" image
  metadata?: {
    year?: number;
    tools?: string;
    client?: string;
  };
};

export function MediaViewer({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: {
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const item = items[currentIndex];

  // Mobile detection (for layout + swipe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Body scroll lock while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 700);
  };

  // Keyboard navigation: ESC closes, ← / → for prev/next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, items.length]);

  // Mobile touch swipe for prev/next
  useEffect(() => {
    if (!isMobile) return;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;
      // Only trigger if horizontal swipe > 50px + dominant over vertical
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && currentIndex > 0) onNavigate(currentIndex - 1);
        else if (dx < 0 && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, currentIndex, items.length]);

  if (!item) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  return (
    <>
      {/* Backdrop — fades in/out */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10002,
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.3s var(--ease-out-soft)',
        }}
      />

      {/* Panel — slides in from the right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.label || 'Media viewer'}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10003,
          background: 'var(--night)',
          color: 'var(--canvas)',
          overflow: 'hidden',
          animation: closing
            ? 'media-viewer-slide-out 0.7s var(--ease-spring-medium) both'
            : 'media-viewer-slide-in 0.7s var(--ease-spring-medium) both',
        }}
      >
        {/* Close button — glass, top-right */}
        <button
          onClick={handleClose}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...ctrlBtnStyle,
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 10005,
          }}
          title="Close (Esc)"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Prev button — glass, left edge, vertically centered */}
        {hasPrev && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              ...ctrlBtnStyle,
              position: 'fixed',
              left: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10005,
            }}
            title="Previous (←)"
            aria-label="Previous"
          >
            ←
          </button>
        )}

        {/* Next button — glass, right edge, vertically centered */}
        {hasNext && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              ...ctrlBtnStyle,
              position: 'fixed',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10005,
            }}
            title="Next (→)"
            aria-label="Next"
          >
            →
          </button>
        )}

        {/* Content — magazine layout on desktop, stacked on mobile.
            The key={currentIndex} forces remount on item change, triggering
            the content-in animation (cross-fade + subtle translateY). */}
        <div
          key={currentIndex}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            padding: isMobile ? '4rem 1rem 4rem' : '4rem 6rem',
            gap: isMobile ? '1.5rem' : '2.5rem',
            animation: 'media-viewer-content-in 0.4s var(--ease-out-soft) both',
          }}
        >
          {/* Main media */}
          <div
            style={{
              flex: isMobile ? '0 0 45vh' : '0 1 65%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {item.type === 'image' ? (
              <img
                src={item.src}
                alt={item.label}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', maxWidth: '100%' }}>
                <iframe
                  src={item.src}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  title={item.label}
                />
              </div>
            )}
          </div>

          {/* Sidebar — process media + description + metadata */}
          <div
            style={{
              flex: isMobile ? '1 1 auto' : '0 0 35%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              overflowY: 'auto',
              padding: isMobile ? '0' : '0 0 0 2rem',
              maxWidth: isMobile ? '100%' : '400px',
            }}
          >
            {/* Label — Fraunces display, large */}
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  color: 'var(--canvas)',
                }}
              >
                {item.label}
              </h3>
            </div>

            {/* Process video (Phase 5b.4 — renders only if URL exists) */}
            {item.processVideoUrl && (
              <div>
                <div
                  className="text-mono text-label"
                  style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}
                >
                  HOW I DID IT — VIDEO
                </div>
                {/* Phase 5b.4 will render the process video here.
                    For now, this section is hidden (no URL yet). */}
                {isYouTubeOrVimeoUrl(item.processVideoUrl) ? (
                  <div style={{ width: '100%', aspectRatio: '16/9' }}>
                    <iframe
                      src={toEmbedUrl(item.processVideoUrl)}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      allow="autoplay; fullscreen; encrypted-media"
                      allowFullScreen
                      title="Process video"
                    />
                  </div>
                ) : (
                  <video
                    src={item.processVideoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: '100%', borderRadius: '2px' }}
                  />
                )}
              </div>
            )}

            {/* Process image (Phase 5b.4 — renders only if URL exists) */}
            {item.processImageUrl && (
              <div>
                <div
                  className="text-mono text-label"
                  style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}
                >
                  HOW I DID IT — IMAGE
                </div>
                <img
                  src={item.processImageUrl}
                  alt="Process — Photoshop layers timeline"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width: '100%',
                    borderRadius: '2px',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                  }}
                />
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div>
                <div
                  className="text-mono text-label"
                  style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}
                >
                  DESCRIPTION
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    color: 'var(--canvas)',
                    opacity: 0.85,
                    margin: 0,
                  }}
                >
                  {item.description}
                </p>
              </div>
            )}

            {/* Metadata — year, tools, client */}
            {item.metadata && (item.metadata.year || item.metadata.tools || item.metadata.client) && (
              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  className="text-mono text-label"
                  style={{
                    color: 'var(--night-muted)',
                    fontSize: '0.7rem',
                    lineHeight: 1.8,
                  }}
                >
                  {item.metadata.year && <div>YEAR — {item.metadata.year}</div>}
                  {item.metadata.tools && <div>TOOLS — {item.metadata.tools}</div>}
                  {item.metadata.client && <div>CLIENT — {item.metadata.client}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10005,
            color: 'var(--canvas)',
            opacity: 0.4,
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono), monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {hasPrev || hasNext
            ? isMobile
              ? 'swipe ← → to navigate · esc to close'
              : '← → to navigate · esc to close'
            : 'esc to close'}
        </div>
      </div>
    </>
  );
}

// ---- helpers (also used by Phase 5b.4 hover preview system) ----

function isYouTubeOrVimeoUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|vimeo\.com)/.test(url);
}

function toEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=1&cc_load_policy=0&vq=hd720`;
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&quality=720p`;
  }
  return url;
}

// ---- shared styles ----

const ctrlBtnStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '4px',
  background: 'rgba(10,10,10,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'var(--canvas)',
  fontSize: '1.2rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s var(--ease-out-soft), border-color 0.2s var(--ease-out-soft)',
};
