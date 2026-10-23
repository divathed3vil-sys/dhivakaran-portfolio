'use client';

import { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings } from '@/lib/supabase-data';

type Settings = {
  name: string;
  tagline: string;
  about: string | null;
  whatsapp: string | null;
  email: string | null;
};

export function SiteSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSiteSettings();
      if (!cancelled && s) {
        setSettings({
          name: s.name,
          tagline: s.tagline,
          about: s.about,
          whatsapp: s.whatsapp,
          email: s.email,
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
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
    }
    setSaving(false);
  };

  if (!settings) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>SITE SETTINGS</div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Tagline</label>
          <input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>About</label>
          <textarea value={settings.about || ''} onChange={(e) => setSettings({ ...settings, about: e.target.value })} rows={6} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-fraunces), serif' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>WhatsApp</label>
          <input value={settings.whatsapp || ''} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="+94 77 089 5006" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Email</label>
          <input value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} placeholder="dhivakaranmohanraj@gmail.com" style={inputStyle} />
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
