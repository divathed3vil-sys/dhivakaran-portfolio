'use client';

import { useEffect, type ReactNode } from 'react';
import { useScrollVelocity } from './lib/use-scroll-velocity';
import { useMagneticCursor } from './lib/use-magnetic-cursor';
import { LightLeak } from './light-leak';

/**
 * EffectsProvider — orchestrates the global, cross-cutting effects:
 *  - #14 scroll-velocity motion blur (body attribute)
 *  - #18 magnetic cursor trailing glow (fixed element)
 *  - #7 light-leak sweep at section boundaries
 *
 * Section-specific effects (#1 tilt-shift, #16 dolly-zoom, #4 bokeh, #21 viewfinder,
 * #23 bloom, #2/#24 heading rack, #5/#10/#28/#30 Selected Work effects) are applied
 * inline in their respective components, not here.
 */
export function EffectsProvider({ children }: { children: ReactNode }) {
  useScrollVelocity();
  const glowRef = useMagneticCursor();

  return (
    <>
      {children}
      <LightLeak />
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
