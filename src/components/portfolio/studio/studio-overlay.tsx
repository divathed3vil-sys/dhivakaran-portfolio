'use client';

import { useEffect, useState } from 'react';
import { useStudio } from './studio-provider';
import { SelectedFramesTab } from './selected-frames-tab';
import { LabTab } from './lab-tab';
import { VideosTab } from './videos-tab';
import { SiteSettingsTab } from './site-settings-tab';

type Tab = 'frames' | 'lab' | 'videos' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'frames', label: 'Selected Frames' },
  { id: 'lab', label: 'Visual Lab' },
  { id: 'videos', label: 'Videos' },
  { id: 'settings', label: 'Site Settings' },
];

export function StudioOverlay() {
  const { authed, closeStudio } = useStudio();
  const [tab, setTab] = useState<Tab>('frames');

  useEffect(() => {
    if (!authed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStudio();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authed, closeStudio]);

  if (!authed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'var(--night)',
        color: 'var(--canvas)',
        overflow: 'auto',
        animation: 'studio-in 0.5s var(--ease-out-soft)',
      }}
    >
      <div className="canvas-max" style={{ paddingBlock: 'calc(32 * var(--px))', minHeight: '100%' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(24 * var(--px))', paddingBottom: 'calc(16 * var(--px))', borderBottom: '1.5px solid var(--night-hr)' }}>
          <div>
            <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>◉ STUDIO</div>
            <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', margin: 0, lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--canvas)' }}>Control Room</h1>
          </div>
          <button type="button" onClick={closeStudio} style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--accent)', color: 'var(--canvas)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'background 0.3s var(--ease-out-soft)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>Sign Out ↑</button>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'calc(24 * var(--px))', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '0.45rem 0.9rem', border: '1.5px solid ' + (tab === t.id ? 'var(--accent)' : 'var(--night-hr)'), background: tab === t.id ? 'var(--accent)' : 'transparent', color: 'var(--canvas)', cursor: 'pointer', fontFamily: 'var(--font-mono), monospace', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {/* tab content */}
        {tab === 'frames' && <SelectedFramesTab />}
        {tab === 'lab' && <LabTab />}
        {tab === 'videos' && <VideosTab />}
        {tab === 'settings' && <SiteSettingsTab />}
      </div>
    </div>
  );
}
