'use client';

import { useMemo } from 'react';

/**
 * #4 Bokeh dust motes — slow-drifting out-of-focus light circles.
 * For dark sections only (Skillset, Contact, Visual Lab overlay).
 * 8 motes, 0.12 opacity, reduced-motion: static.
 */
export function BokehField({ count = 8 }: { count?: number }) {
  const motes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const size = 30 + ((i * 23) % 60);
      return {
        size,
        left: `${((i * 137) % 100)}%`,
        top: `${((i * 89) % 100)}%`,
        duration: `${18 + (i % 5) * 4}s`,
        delay: `${(i % 4) * -5}s`,
        bx: `${((i * 53) % 80) - 40}px`,
        by: `${((i * 31) % 60) - 30}px`,
        key: i,
      };
    });
  }, [count]);

  return (
    <div className="bokeh-field" aria-hidden="true">
      {motes.map((m) => (
        <span
          key={m.key}
          className="bokeh-mote"
          style={{
            width: `${m.size}px`,
            height: `${m.size}px`,
            left: m.left,
            top: m.top,
            animationDuration: m.duration,
            animationDelay: m.delay,
            ['--bx' as string]: m.bx,
            ['--by' as string]: m.by,
          }}
        />
      ))}
    </div>
  );
}
