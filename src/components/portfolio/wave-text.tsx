'use client';

import { useEffect, useMemo, useRef } from 'react';

/**
 * WaveText — "developing" text reveal.
 * Each character develops from latent (light/dim) → brass flash → exposed ink
 * as it crosses the viewport, synced to scroll progress.
 *
 * Used in the About paragraph and contact headline.
 *
 * Markup mirrors Pamidor pattern: [data-wave] > [data-word] > [data-char]
 */
export function WaveText({
  text,
  className = '',
  as: Tag = 'p',
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const charsRef = useRef<HTMLElement[]>([]);

  const words = useMemo(() => text.split(' '), [text]);

  // collect char refs into a flat array
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = Array.from(
      container.querySelectorAll<HTMLElement>('[data-char]')
    );
    charsRef.current = chars;

    // if reduced motion, light everything immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      chars.forEach((c) => c.setAttribute('data-lit', ''));
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = container.getBoundingClientRect();
      const innerH = window.innerHeight;

      // desktop pinned progress: (-top) / (height - innerH)
      // mobile progress: (0.85*innerH - top) / (0.6*innerH)
      let p: number;
      if (rect.height > innerH * 0.8) {
        p = (-rect.top) / (rect.height - innerH);
      } else {
        p = (0.85 * innerH - rect.top) / (0.6 * innerH);
      }
      p = Math.max(0, Math.min(1, p));

      const total = chars.length;
      const litCount = Math.round(p * total);

      // light chars 0..litCount, unlight the rest
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
  }, []);

  let charIdx = 0;

  return (
    <Tag
      ref={containerRef as React.Ref<HTMLElement>}
      className={className}
      data-wave=""
    >
      {words.map((word, wi) => (
        <span key={wi} data-word="" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {word.split('').map((c) => {
            const idx = charIdx++;
            return (
              <span key={idx} data-char="" style={{ display: 'inline-block' }}>
                {c}
              </span>
            );
          })}
          {wi < words.length - 1 ? (
            <span data-char="" style={{ display: 'inline-block' }}>
              {'\u00A0'}
            </span>
          ) : null}
        </span>
      ))}
    </Tag>
  );
}
