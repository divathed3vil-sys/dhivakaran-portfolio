'use client';

import { useEffect, useState } from 'react';

export function IntroLoader() {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>('in');
  const [frame, setFrame] = useState(241);
  const [chipSrc, setChipSrc] = useState('/images/landing-low.webp');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.removeAttribute('data-loading');
      const t = setTimeout(() => setPhase('done'), 0);
      return () => clearTimeout(t);
    }

    // frame counter
    const frameInterval = setInterval(() => {
      setFrame((f) => (f >= 250 ? (clearInterval(frameInterval), f) : f + 1));
    }, 130);

    // fetch lab images from Supabase (dynamic import = no SSR issue) + cycle
    let chipInterval: ReturnType<typeof setInterval>;
    let cancelled = false;
    (async () => {
      try {
        const { getLabImageUrls } = await import('@/lib/supabase-data');
        const { lowResUrl } = await import('./lib/use-portfolio-data');
        const urls = await getLabImageUrls();
        if (cancelled || urls.length === 0) return;
        const processed = urls.map((u) => lowResUrl(u, 400));
        // start cycling
        let idx = 0;
        setChipSrc(processed[0]);
        chipInterval = setInterval(() => {
          idx = (idx + 1) % processed.length;
          setChipSrc(processed[idx]);
        }, 200);
      } catch {}
    })();

    const exitTimer = setTimeout(() => setPhase('out'), 1880);
    const doneTimer = setTimeout(() => {
      document.documentElement.removeAttribute('data-loading');
      setPhase('done');
    }, 2440);

    return () => {
      clearInterval(frameInterval);
      clearInterval(chipInterval);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      cancelled = true;
    };
  }, []);

  if (phase === 'done') return null;

  const letters = 'DHIVAKARAN\u00A0\u00A0\u00A0M'.split('');
  const word = phase === 'in';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'var(--night)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1.5rem',
        animation: phase === 'out' ? 'loader-letter-out 0.42s var(--ease-curtain) both' : 'none',
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 0.42s var(--ease-curtain)',
      }}
    >
      <div className="leader-track text-label" style={{ color: 'var(--brass)', opacity: 0.7, position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
        <span>FRAME </span>
        <span style={{ display: 'inline-block', minWidth: '4ch' }}>{String(frame).padStart(4, '0')}</span>
        <span> / 0250</span>
      </div>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--brass)', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brass)', animation: 'iris-pulse 1.4s var(--ease-out-soft) infinite' }} />
      </div>
      <div aria-hidden="true" style={{ display: 'flex', fontSize: 'clamp(1.5rem, 5vw, 3rem)', fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--canvas)', overflow: 'hidden' }}>
        {letters.map((c, i) => (
          <span key={i} style={{ display: 'inline-block', animation: `loader-letter-in 0.62s var(--ease-out-soft) ${45 * i}ms both`, filter: word ? 'blur(0)' : 'blur(8px)', opacity: word ? 1 : 0 }}>{c}</span>
        ))}
      </div>
      <div style={{ width: '120px', height: '80px', overflow: 'hidden', border: '1.5px solid var(--brass)', marginTop: '0.5rem', opacity: 0.8 }}>
        <div key={chipSrc} style={{ width: '100%', height: '100%', backgroundImage: `url(${chipSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1) contrast(1.1) brightness(0.85)', animation: 'chip-fade 0.15s linear' }} />
      </div>
      <style>{`@keyframes iris-pulse {0%,100%{transform:scale(0.4);opacity:0.4}50%{transform:scale(1);opacity:1}} @keyframes chip-fade {from{opacity:0.3}to{opacity:1}}`}</style>
    </div>
  );
}
