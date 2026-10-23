'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';

/**
 * WaveText — "developing" text reveal.
 * Each character develops from latent (light/dim) → flash → exposed ink
 * as scroll progresses, synced to a root element's travel through the viewport.
 *
 * Pass `rootRef` to sync the reveal to a parent sticky-travel wrapper:
 * progress 0 when the root just enters/pins, 1 when it's about to leave/unpin.
 * Without `rootRef`, falls back to the container's own travel.
 *
 * Markup mirrors Pamidor pattern: [data-wave] > [data-word] > [data-char]
 */
export function WaveText({
  text,
  className = '',
  as: Tag = 'p',
  rootRef,
  speedMultiplier = 1,
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
  rootRef?: RefObject<HTMLElement>;
  speedMultiplier?: number;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const charsRef = useRef<HTMLElement[]>([]);

  const lines = useMemo(() => text.split('\n'), [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = Array.from(
      container.querySelectorAll<HTMLElement>('[data-char]')
    );
    charsRef.current = chars;

    // reduced motion: light everything immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      chars.forEach((c) => c.setAttribute('data-lit', ''));
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      // the root element whose scroll travel drives the reveal
      const root = rootRef?.current || container;
      const rect = root.getBoundingClientRect();
      const innerH = window.innerHeight;

      // progress 0 → 1 across the root's travel through the viewport.
      // For a sticky-travel wrapper taller than the viewport:
      //   progress 0 when root.top reaches 0 (just pinned)
      //   progress 1 when root.bottom reaches viewport bottom (about to unpin)
      let p: number;
      if (rect.height > innerH) {
        p = -rect.top / (rect.height - innerH);
      } else {
        // shorter root: reveal as it crosses the center band
        p = (0.7 * innerH - rect.top) / (0.5 * innerH + rect.height);
      }
      p = Math.max(0, Math.min(1, p * speedMultiplier));

      const total = chars.length;
      // light chars 0..litCount with a slight lead so the last char
      // is fully lit by the time the root unpinns
      const litCount = Math.round(p * total);

      for (let i = 0; i < total; i++) {
        if (i < litCount) {
          if (!chars[i].hasAttribute('data-lit')) {
            chars[i].setAttribute('data-lit', '');
          }
        } else {
          if (chars[i].hasAttribute('data-lit')) {
            chars[i].removeAttribute('data-lit');
          }
        }
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rootRef]);

  let charIdx = 0;

  return (
    <Tag
      ref={containerRef as React.Ref<HTMLElement>}
      className={className}
      data-wave=""
    >
      {lines.map((line, li) => (
        <span
          key={li}
          style={{ display: 'block' }}
        >
          {line.split(' ').map((word, wi) => {
            const words = line.split(' ');
            return (
              <span
                key={`${li}-${wi}`}
                data-word=""
                style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
              >
                {word.split('').map((c) => {
                  const idx = charIdx++;
                  return (
                    <span key={idx} data-char="" style={{ display: 'inline-block' }}>
                      {c}
                    </span>
                  );
                })}
                {!(li === lines.length - 1 && wi === words.length - 1) ? (
                  <span data-char="" style={{ display: 'inline-block' }}>
                    {'\u00A0'}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
