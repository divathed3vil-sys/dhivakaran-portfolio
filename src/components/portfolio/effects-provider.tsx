'use client';

import { type ReactNode } from 'react';
import { useMagneticCursor } from './lib/use-magnetic-cursor';
import { LightLeak } from './light-leak';
import { BlurEffects } from './blur-effects';

/**
 * EffectsProvider — orchestrates the global, cross-cutting effects:
 *  - #18 magnetic cursor trailing glow (fixed element)
 *  - #7 light-leak sweep at section boundaries
 *  - BlurEffects — scroll-activated blur + permanent edge vignette + random
 *    subtle flickers (very low intensity, only while scrolling + at edges)
 *
 * Section-specific effects are applied inline in their components.
 */
export function EffectsProvider({ children }: { children: ReactNode }) {
  const glowRef = useMagneticCursor();

  return (
    <>
      {children}
      <LightLeak />
      <BlurEffects />
      <div className="magnetic-glow" ref={glowRef} aria-hidden="true" />
    </>
  );
}

/**
 * Helper to trigger a one-shot light-leak sweep programmatically
 * (e.g., when the Visual Lab overlay opens). Returns a function.
 */
export function useLightLeakTrigger() {
  return () => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const leak = document.querySelector('.light-leak') as HTMLElement | null;
    if (!leak) return;
    leak.classList.remove('sweeping');
    void leak.offsetWidth;
    leak.classList.add('sweeping');
  };
}

// re-export hooks for convenience
export { useBloom, useHeadingRack } from './lib/use-bloom-rack';
