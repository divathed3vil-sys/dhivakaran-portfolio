'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiteSettings, updateSiteSettings } from '@/lib/supabase-data';

type Settings = {
  name: string;
  tagline: string;
  about: string | null;
  whatsapp: string | null;
  email: string | null;
};

export function SiteSettingsTab() {
  // Phase 5b.6 — React Query replaces raw useEffect+setState.
  // Draft/merge pattern: server data is the source of truth, user edits are
  // stored as overrides in `draft`. No useEffect → no cascading renders.
  const queryClient = useQueryClient();
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: getSiteSettings,
  });

  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Merged settings: server data + draft overrides
  const settings: Settings = {
    name: draft.name ?? (serverSettings as Settings | null)?.name ?? '',
    tagline: draft.tagline ?? (serverSettings as Settings | null)?.tagline ?? '',
    about: draft.about ?? (serverSettings as Settings | null)?.about ?? null,
    whatsapp: draft.whatsapp ?? (serverSettings as Settings | null)?.whatsapp ?? null,
    email: draft.email ?? (serverSettings as Settings | null)?.email ?? null,
  };

  const update = (field: keyof Settings, value: string | null) => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('Saving…');
    const { error } = await updateSiteSettings({
      name: settings.name,
      tagline: settings.tagline,
      about: settings.about,
      whatsapp: settings.whatsapp,
      email: settings.email,
    });
    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg('Saved. Changes appear on the public site.');
      setDraft({}); // clear overrides — server data is now up to date
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    }
    setSaving(false);
  };

  if (isLoading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;
  if (!serverSettings) return <div style={{ color: 'var(--night-muted)' }}>No settings found.</div>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>SITE SETTINGS</div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input value={settings.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Tagline</label>
          <input value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>About</label>
          <textarea value={settings.about || ''} onChange={(e) => update('about', e.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-fraunces), serif' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>WhatsApp</label>
          <input value={settings.whatsapp || ''} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+94 77 089 5006" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Email</label>
          <input value={settings.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="dhivakaranmohanraj@gmail.com" style={inputStyle} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {msg && <div style={{ color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--night)',
  border: '1.5px solid var(--night-hr)',
  color: 'var(--canvas)',
  padding: '0.5rem 0.7rem',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
};

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1.2rem',
  border: '1.5px solid var(--accent)',
  background: 'transparent',
  color: 'var(--canvas)',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
