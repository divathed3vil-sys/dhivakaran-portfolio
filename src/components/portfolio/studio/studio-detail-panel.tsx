'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * StudioDetailPanel — slides in from the right when a card is clicked.
 * Contains all editable fields for an image or video.
 *
 * Layout:
 *   - Fixed position, right side of screen (below top bar, above status bar)
 *   - Width: 420px desktop, full width mobile
 *   - Glass background (studio-glass-strong)
 *   - Header: item title + close button
 *   - Body: scrollable (children = editable fields)
 *   - Footer: Save + Delete buttons
 *
 * Animation: slides in from right with --ease-spring-medium (matches MediaViewer + Nav menu direction)
 */
export function StudioDetailPanel({
  title,
  preview,
  children,
  onSave,
  onClose,
  onDelete,
  isMobile,
}: {
  title: string;
  preview?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  onClose: () => void;
  onDelete?: () => void;
  isMobile: boolean;
}) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 500);
  };

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Backdrop — click to close (only covers the main content area, not the full screen) */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: '56px',
          bottom: '36px',
          left: isMobile ? 0 : '240px',
          right: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 20,
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.3s var(--ease-out-soft)',
        }}
      />
      {/* Panel — slides in from right */}
      <div
        role="dialog"
        aria-label={`Edit: ${title}`}
        style={{
          position: 'fixed',
          top: '56px',
          bottom: '36px',
          right: 0,
          width: isMobile ? '100%' : '420px',
          zIndex: 21,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          animation: closing
            ? 'detail-panel-slide-out 0.5s var(--ease-spring-medium) both'
            : 'detail-panel-slide-in 0.5s var(--ease-spring-medium) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            EDITING
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px', height: '32px', borderRadius: '3px',
              background: 'rgba(22,22,22,0.6)', border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--canvas)', cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s var(--ease-spring-soft)',
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div style={{ padding: '0.75rem 1.25rem 0.5rem', flexShrink: 0 }}>
          <h2 style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: '1.25rem',
            margin: 0,
            color: 'var(--canvas)',
            lineHeight: 1.2,
          }}>
            {title}
          </h2>
        </div>

        {/* Preview (image or video thumbnail) */}
        {preview && (
          <div style={{ padding: '0 1.25rem 0.75rem', flexShrink: 0 }}>
            {preview}
          </div>
        )}

        {/* Body — scrollable editable fields */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 1.25rem',
        }}>
          {children}
        </div>

        {/* Footer — Save + Delete */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {onSave && (
            <button
              onClick={onSave}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '3px',
                border: '1px solid var(--accent)',
                background: 'rgba(214,41,41,0.15)',
                color: 'var(--canvas)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'background 0.3s var(--ease-spring-soft)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}
            >
              Save Changes
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '3px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'background 0.3s var(--ease-spring-soft)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              ✕ Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
