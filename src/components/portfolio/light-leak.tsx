'use client';

import { useEffect, useRef } from 'react';

/**
 * #7 Light-leak sweep — subtle red/white gradient sweep at key section boundaries.
 * A fixed overlay that plays a 0.9s sweep animation when triggered.
 * Triggers on entry of major sections (hero→about, about→work, work→labcard, labcard→skillset).
 */
export function LightLeak() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const leak = ref.current;
    if (!leak) return;

    // observe section boundaries
    const triggers = ['#about', '#work', '#visual-lab-card', '#skillset'];
    const elements = triggers
      .map((s) => document.querySelector(s))
      .filter(Boolean) as HTMLElement[];

    let lastTriggered = '';

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.15) {
            const id = e.target.id;
            if (id !== lastTriggered) {
              lastTriggered = id;
              // play sweep
              leak.classList.remove('sweeping');
              void leak.offsetWidth; // reflow
              leak.classList.add('sweeping');
            }
          }
        });
      },
      { threshold: [0, 0.15, 0.5] }
    );
    elements.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return <div className="light-leak" ref={ref} aria-hidden="true" />;
}
