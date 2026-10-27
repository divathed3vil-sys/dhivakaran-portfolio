'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
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
const ExperiencesTab = dynamic(
  () => import('./experiences-tab').then((m) => ({ default: m.ExperiencesTab })),
  { ssr: false }
);
const SiteSettingsTab = dynamic(
  () => import('./site-settings-tab').then((m) => ({ default: m.SiteSettingsTab })),
  { ssr: false }
);

type Tab = 'frames' | 'lab' | 'videos' | 'experiences' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'frames', label: 'Selected Frames', icon: '▣' },
  { id: 'lab', label: 'Visual Lab', icon: '◉' },
  { id: 'videos', label: 'Videos', icon: '►' },
  { id: 'experiences', label: 'Experiences', icon: '✦' },
  { id: 'settings', label: 'Site Settings', icon: '⚙' },
];

// Phase 5b.6 — scoped QueryClient for the Studio.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function StudioOverlay() {
  const { authed, closeStudio } = useStudio();
  const [tab, setTab] = useState<Tab>('frames');
  const [isMobile, setIsMobile] = useState(false);

  // Body scroll lock + ESC to close
  useEffect(() => {
    if (!authed) return;
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

  // Detect mobile for layout switching
  useEffect(() => {
    if (!authed) return;
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [authed]);

  // Prefetch all tabs' data
  useEffect(() => {
    if (!authed) return;
    queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: getCategories });
    queryClient.prefetchQuery({ queryKey: ['allImages'], queryFn: getAllImages });
    queryClient.prefetchQuery({ queryKey: ['allVideos'], queryFn: getAllVideos });
    queryClient.prefetchQuery({ queryKey: ['siteSettings'], queryFn: getSiteSettings });
    // Experiences are fetched from /api/experiences (no Supabase involvement)
    queryClient.prefetchQuery({
      queryKey: ['experiences'],
      queryFn: async () => {
        const res = await fetch('/api/experiences', { cache: 'no-store' });
        return res.json();
      },
    });
  }, [authed]);

  if (!authed) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StudioShell
        tab={tab}
        setTab={setTab}
        isMobile={isMobile}
        closeStudio={closeStudio}
      />
    </QueryClientProvider>
  );
}

/**
 * StudioShell — the 3-pane layout:
 *   1. Top bar (sticky, glass): STUDIO label + breadcrumb + Preview + Close
 *   2. Middle (flex row): Sidebar (vertical tab nav + stats) + Main content (scrollable)
 *   3. Status bar (sticky bottom, glass): counts + save status
 *
 * On mobile: sidebar collapses, tabs become a horizontal scroll bar.
 */
function StudioShell({
  tab,
  setTab,
  isMobile,
  closeStudio,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  isMobile: boolean;
  closeStudio: () => void;
}) {
  // Read stats from React Query cache (instantly available — prefetched on Studio open)
  const { data: imgs = [] } = useQuery({ queryKey: ['allImages'], queryFn: getAllImages });
  const { data: vids = [] } = useQuery({ queryKey: ['allVideos'], queryFn: getAllVideos });
  const { data: experiencesData } = useQuery({
    queryKey: ['experiences'],
    queryFn: async () => {
      const res = await fetch('/api/experiences', { cache: 'no-store' });
      return res.json();
    },
  });

  const totalImgs = (imgs as any[]).length;
  const publishedImgs = (imgs as any[]).filter((i) => i.published).length;
  const labImgs = (imgs as any[]).filter((i) => i.in_lab).length;
  const totalVids = (vids as any[]).length;
  const totalExperiences = (experiencesData as any)?.experiences?.length ?? 0;

  const activeTab = TABS.find((t) => t.id === tab);

  const tabCounts: Record<Tab, number> = {
    frames: totalImgs,
    lab: labImgs,
    videos: totalVids,
    experiences: totalExperiences,
    settings: 0,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio"
      data-lenis-prevent=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'var(--canvas)',
        overflow: 'hidden',
        animation: 'studio-in 0.5s var(--ease-spring-medium)',
      }}
    >
      {/* ════════ TOP BAR (sticky, glass) ════════ */}
      <div
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,10,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>◉ STUDIO</span>
          <span style={{ color: 'var(--night-muted)', fontSize: '0.7rem' }}>›</span>
          <span style={{ color: 'var(--canvas)', fontFamily: 'var(--font-fraunces), serif', fontSize: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 500, letterSpacing: '-0.01em' }}>
            {activeTab?.label || 'Studio'}
          </span>
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => window.open('/', '_blank')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '3px',
              color: 'var(--canvas)',
              background: 'rgba(22,22,22,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              transition: 'background 0.3s var(--ease-spring-soft), border-color 0.3s var(--ease-spring-soft)',
            }}
            title="Open the live public site in a new tab"
          >
            ↗ Preview
          </button>
          <button
            type="button"
            onClick={closeStudio}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '3px',
              border: '1px solid var(--accent)',
              color: 'var(--canvas)',
              background: 'rgba(214,41,41,0.15)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              transition: 'background 0.3s var(--ease-spring-soft)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* ════════ MIDDLE: SIDEBAR + MAIN CONTENT ════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── SIDEBAR (desktop only) ─── */}
        {!isMobile && (
          <div
            style={{
              width: '240px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(10,10,10,0.3)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Tab navigation (vertical) */}
            <div style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '3px',
                    border: 'none',
                    color: tab === t.id ? 'var(--canvas)' : 'var(--night-muted)',
                    background: tab === t.id ? 'rgba(214,41,41,0.15)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.75rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    transition: 'background 0.3s var(--ease-spring-soft), color 0.3s var(--ease-spring-soft)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', opacity: tab === t.id ? 1 : 0.5 }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {tabCounts[t.id] > 0 && (
                    <span style={{
                      fontSize: '0.65rem',
                      color: tab === t.id ? 'var(--accent)' : 'var(--night-muted)',
                      opacity: 0.8,
                    }}>
                      {tabCounts[t.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '0 1rem' }} />

            {/* Upload button */}
            <div style={{ padding: '1rem 0.75rem' }}>
              <button
                onClick={() => {
                  // Scroll to top of main content (where upload forms are)
                  const main = document.getElementById('studio-main');
                  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '3px',
                  border: '1px solid var(--accent)',
                  background: 'rgba(214,41,41,0.1)',
                  color: 'var(--canvas)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  transition: 'background 0.3s var(--ease-spring-soft)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.1)'; }}
              >
                + Upload
              </button>
            </div>

            {/* Stats at bottom */}
            <div style={{ marginTop: 'auto', padding: '1rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.6rem', color: 'var(--night-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Overview</div>
              <SidebarStat label="Total Images" value={totalImgs} />
              <SidebarStat label="Published" value={publishedImgs} accent />
              <SidebarStat label="In Lab" value={labImgs} />
              <SidebarStat label="Videos" value={totalVids} />
            </div>
          </div>
        )}

        {/* ─── MAIN CONTENT (scrollable) ─── */}
        <div
          id="studio-main"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '1rem' : '1.5rem 2rem',
          }}
        >
          {/* Mobile tab bar (horizontal scroll) */}
          {isMobile && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', flexShrink: 0 }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '3px',
                    border: 'none',
                    color: tab === t.id ? 'var(--canvas)' : 'var(--night-muted)',
                    background: tab === t.id ? 'rgba(214,41,41,0.15)' : 'rgba(22,22,22,0.4)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.7rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          {tab === 'frames' && <SelectedFramesTab />}
          {tab === 'lab' && <LabTab />}
          {tab === 'videos' && <VideosTab />}
          {tab === 'experiences' && <ExperiencesTab />}
          {tab === 'settings' && <SiteSettingsTab />}
        </div>
      </div>

      {/* ════════ STATUS BAR (sticky bottom, glass) ════════ */}
      <div
        style={{
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,10,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          flexShrink: 0,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.65rem',
          color: 'var(--night-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>Total: {totalImgs}</span>
          <span>Published: {publishedImgs}</span>
          <span>Lab: {labImgs}</span>
          {totalVids > 0 && <span>Videos: {totalVids}</span>}
          {totalExperiences > 0 && <span>Experiences: {totalExperiences}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
          All changes saved
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--night-muted)', fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: accent ? 'var(--accent)' : 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
