'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllVideos, addVideo, deleteVideo } from '@/lib/supabase-data';

type Video = {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  description: string | null;
  priority: number;
  published: boolean;
};

/** Extract a YouTube video ID from various URL formats. */
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Extract a Vimeo video ID from various URL formats. */
function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Get the thumbnail URL for a video. */
function getThumbnail(video: Video): string {
  if (video.platform === 'youtube') {
    const id = extractYouTubeId(video.url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
  }
  // Vimeo doesn't have a simple thumbnail URL without API — use a placeholder
  return '';
}

/** Get the embed URL for a video. */
function getEmbedUrl(video: Video): string {
  if (video.platform === 'youtube') {
    const id = extractYouTubeId(video.url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0` : video.url;
  }
  const id = extractVimeoId(video.url);
  return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : video.url;
}

export function VideosTab() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'youtube' | 'vimeo'>('youtube');
  const [label, setLabel] = useState('');
  const [priority, setPriority] = useState(0);
  const [msg, setMsg] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const v = await getAllVideos();
    setVideos((v as Video[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // auto-detect platform from URL
  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (val.includes('youtube.com') || val.includes('youtu.be')) setPlatform('youtube');
    else if (val.includes('vimeo.com')) setPlatform('vimeo');
  };

  const handleAdd = async () => {
    if (!url.trim()) return;
    const { error } = await addVideo({
      url: url.trim(),
      platform,
      label: label || null,
      priority,
      published: true,
    });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setUrl(''); setLabel(''); setPriority(0);
    setMsg('Video added + published.');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    await deleteVideo(id);
    load();
  };

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
      {/* Add video form */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>ADD VIDEO</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>URL (YouTube or Vimeo)</label>
            <input value={url} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
          </div>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as 'youtube' | 'vimeo')} style={inputStyle}>
              <option value="youtube">youtube</option>
              <option value="vimeo">vimeo</option>
            </select>
          </div>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Title Sequence" style={inputStyle} />
          </div>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
            <input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
          </div>
          <button onClick={handleAdd} style={btnStyle}>+ Add</button>
        </div>
      </div>

      {/* Video list */}
      <div>
        <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.75rem' }}>
          VIDEOS ({videos.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {videos.map((v) => (
            <div key={v.id} style={{ border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)', overflow: 'hidden' }}>
              <div
                style={{ width: '100%', aspectRatio: '16/9', background: '#000', cursor: 'pointer', position: 'relative' }}
                onClick={() => setPlaying(v.id)}
              >
                {getThumbnail(v) ? (
                  <img src={getThumbnail(v)} alt={v.label || 'Video'} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.3) brightness(0.85)' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--night-muted)', fontSize: '0.8rem' }}>{v.platform}</div>
                )}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--canvas)', opacity: 0.7 }}>▶</div>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--canvas)' }}>{v.label || 'Untitled'}</div>
                  <div className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>P{v.priority} · {v.platform}</div>
                </div>
                <button onClick={() => handleDelete(v.id)} style={miniBtn}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {videos.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No videos yet.</div>}
      </div>

      {/* Lightbox player */}
      {playing && (() => {
        const v = videos.find((x) => x.id === playing);
        if (!v) return null;
        return (
          <div
            onClick={() => setPlaying(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ width: '90vw', maxWidth: '900px', aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
              <iframe src={getEmbedUrl(v)} style={{ width: '100%', height: '100%', border: 0 }} allow="autoplay; fullscreen" allowFullScreen title={v.label || 'Video'} />
            </div>
          </div>
        );
      })()}

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--night)',
  border: '1.5px solid var(--night-hr)',
  color: 'var(--canvas)',
  padding: '0.4rem 0.6rem',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
};

const btnStyle: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  border: '1.5px solid var(--accent)',
  background: 'transparent',
  color: 'var(--canvas)',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const miniBtn: React.CSSProperties = {
  ...btnStyle,
  padding: '0.15rem 0.4rem',
  fontSize: '0.7rem',
  border: '1px solid var(--night-hr)',
  lineHeight: 1,
};
