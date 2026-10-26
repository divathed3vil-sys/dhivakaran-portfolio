'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStudio } from './studio-provider';
import { getCategories, getAllImages, getAllVideos, getSiteSettings } from '@/lib/supabase-data';

// Phase 4 — each Studio tab is dynamic-imported so its specific code only
// loads when the user actually opens that tab (not when the Studio overlay
// first mounts). The tab navigation chrome (this component) stays small.
const SelectedFramesTab = dynamic(
  () => import('./selected-frames-tab').then((m) => ({ default: m.SelectedFramesTab })),
  { ssr: false }
);
const LabTab = dynamic(
  () => import('./lab-tab').then((m) => ({ default: m.LabTab })),
  { ssr: false }
);
const VideosTab = dynamic(
  () => import('./videos-tab').then((m) => ({ default: m.VideosTab })),
  { ssr: false }
);
const SiteSettingsTab = dynamic(
  () => import('./site-settings-tab').then((m) => ({ default: m.SiteSettingsTab })),
  { ssr: false }
);

type Tab = 'frames' | 'lab' | 'videos' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'frames', label: 'Selected Frames' },
  { id: 'lab', label: 'Visual Lab' },
  { id: 'videos', label: 'Videos' },
  { id: 'settings', label: 'Site Settings' },
];

// Phase 5b.6 — scoped QueryClient for the Studio. Created once per Studio
// session (not at app root) so the public site doesn't carry React Query
// overhead. All Studio tabs share this client — automatic caching, background
// refetching, prefetching, and cache invalidation on mutations.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,     // data stays fresh for 30s before background refetch
      refetchOnWindowFocus: false, // don't refetch when user switches back to the tab
    },
  },
});

export function StudioOverlay() {
  const { authed, closeStudio } = useStudio();
  const [tab, setTab] = useState<Tab>('frames');

  useEffect(() => {
    if (!authed) return;
    // Critical fix: lock body scroll so the background page doesn't scroll
    // when the user scrolls inside the Studio.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStudio();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [authed, closeStudio]);

  // Phase 5b.6 — prefetch all tabs' data when Studio opens, so tab switching
  // is instant (data is already cached by the time the user clicks a tab).
  useEffect(() => {
    if (!authed) return;
    queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: getCategories });
    queryClient.prefetchQuery({ queryKey: ['allImages'], queryFn: getAllImages });
    queryClient.prefetchQuery({ queryKey: ['allVideos'], queryFn: getAllVideos });
    queryClient.prefetchQuery({ queryKey: ['siteSettings'], queryFn: getSiteSettings });
  }, [authed]);

  if (!authed) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Studio"
        className="studio-glass-strong"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10001,
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'var(--canvas)',
          overflow: 'auto',
          animation: 'studio-in 0.5s var(--ease-spring-medium)',
        }}
      >
        <div className="canvas-max" style={{ paddingBlock: 'calc(32 * var(--px))', minHeight: '100%' }}>
          {/* header — glass + spring transition on Studio open */}
          <div className="studio-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(24 * var(--px))', padding: '1rem 1.25rem', borderRadius: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>◉ STUDIO</div>
              <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', margin: 0, lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--canvas)' }}>Control Room</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => window.open('/', '_blank')}
                className="studio-glass"
                style={{ padding: '0.5rem 1rem', borderRadius: '3px', color: 'var(--canvas)', background: 'rgba(22,22,22,0.6)', cursor: 'pointer', fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'border-color 0.3s var(--ease-spring-soft), background 0.3s var(--ease-spring-soft)' }}
                title="Open the live public site in a new tab"
              >
                ↗ Preview Site
              </button>
              <button type="button" onClick={closeStudio} className="studio-glass" style={{ padding: '0.5rem 1rem', borderRadius: '3px', border: '1px solid var(--accent)', color: 'var(--canvas)', background: 'rgba(214,41,41,0.15)', cursor: 'pointer', fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'background 0.3s var(--ease-spring-soft)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}>Sign Out ↑</button>
            </div>
          </div>

          {/* tabs — spring-eased active state */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'calc(24 * var(--px))', flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="studio-glass" style={{ padding: '0.45rem 0.9rem', borderRadius: '3px', border: '1px solid ' + (tab === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'), background: tab === t.id ? 'rgba(214,41,41,0.2)' : 'rgba(22,22,22,0.6)', color: 'var(--canvas)', cursor: 'pointer', fontFamily: 'var(--font-mono), monospace', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'background 0.3s var(--ease-spring-soft), border-color 0.3s var(--ease-spring-soft)' }}>{t.label}</button>
            ))}
          </div>

          {/* tab content */}
          {tab === 'frames' && <SelectedFramesTab />}
          {tab === 'lab' && <LabTab />}
          {tab === 'videos' && <VideosTab />}
          {tab === 'settings' && <SiteSettingsTab />}
        </div>
      </div>
    </QueryClientProvider>
  );
}
