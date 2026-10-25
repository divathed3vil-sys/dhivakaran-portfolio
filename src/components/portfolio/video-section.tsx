'use client';

import { useEffect, useState } from 'react';
import { getVideos } from '@/lib/supabase-data';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';

type Video = {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  description: string | null;
  priority: number;
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function getThumbnail(v: Video): string {
  if (v.platform === 'youtube') {
    const id = extractYouTubeId(v.url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
  }
  return '';
}

function getEmbedUrl(v: Video): string {
  if (v.platform === 'youtube') {
    const id = extractYouTubeId(v.url);
    // Phase 5b fix — all the modest-branding + clean-player params YouTube
    // exposes via iframe URL. vq=hd720 attempts to force 720p default
    // (deprecated but YouTube still respects it in some cases). iv_load_policy=3
    // hides annotations. rel=0 hides related videos at end. modestbranding=1
    // reduces the YouTube logo + chrome. playsinline=1 for iOS inline play.
    // fs=1 allows fullscreen. cc_load_policy=0 disables closed captions by default.
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=1&cc_load_policy=0&vq=hd720`
      : v.url;
  }
  const id = extractVimeoId(v.url);
  return id ? `https://player.vimeo.com/video/${id}?autoplay=1&quality=720p` : v.url;
}

export function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const bloomRef = useBloom<HTMLDivElement>();
  const titleRef = useHeadingRack<HTMLHeadingElement>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getVideos();
      if (!cancelled) setVideos((v as Video[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (videos.length === 0) return null;

  return (
    <section
      id="videos"
      data-canvas="home"
      aria-label="Video work"
      style={{
        background: 'var(--canvas)',
        paddingBlock: 'calc(80 * var(--px))',
        position: 'relative',
        overflow: 'hidden',
        // Phase 3 — skip paint/layout for offscreen content.
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 80vh',
      }}
    >
      <div className="canvas-max" style={{ position: 'relative' }}>
        <div ref={bloomRef}>
          <h2
            ref={titleRef}
            className="text-section"
            style={{
              color: 'var(--ink)',
              margin: '0 0 calc(38 * var(--px))',
              maxWidth: '14ch',
            }}
          >
            Video{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--muted)' }}>
              work
            </em>
          </h2>

          <hr className="hairline" style={{ margin: '0 0 calc(48 * var(--px))' }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
              gap: 'calc(20 * var(--px))',
            }}
          >
            {videos.map((v) => (
              <div
                key={v.id}
                onClick={() => setPlaying(v.id)}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  aspectRatio: '16/9',
                  overflow: 'hidden',
                  background: '#000',
                  // Phase 5b fix — removed the 6px white border (the "frame" you
                  // didn't want). Subtle shadow only for depth.
                  boxShadow: '0 12px 32px -10px rgba(10,10,10,0.4)',
                  borderRadius: '2px',
                  transition: 'transform 0.4s var(--ease-spring-soft), box-shadow 0.4s var(--ease-out-soft)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {getThumbnail(v) ? (
                  <img
                    src={getThumbnail(v)}
                    alt={v.label || 'Video'}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.95) contrast(1.05) brightness(0.9)', transition: 'filter 0.4s var(--ease-out-soft)' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--canvas)', fontSize: '0.8rem', opacity: 0.5 }}>{v.platform}</div>
                )}
                {/* play button — Apple-style glass */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', color: 'var(--canvas)',
                    transition: 'transform 0.3s var(--ease-spring-soft), background 0.3s var(--ease-out-soft)',
                  }}>▶</div>
                </div>
                {/* label */}
                {v.label && (
                  <div className="text-mono text-label" style={{
                    position: 'absolute', bottom: '8px', left: '8px',
                    color: 'var(--canvas)', background: 'rgba(10,10,10,0.7)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    padding: '2px 6px', zIndex: 2,
                  }}>
                    {v.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {playing && (() => {
        const v = videos.find((x) => x.id === playing);
        if (!v) return null;
        return (
          <div
            onClick={() => setPlaying(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: '90vw', maxWidth: '900px', aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
              <iframe
                src={getEmbedUrl(v)}
                style={{ width: '100%', height: '100%', border: 0 }}
                allow="autoplay; fullscreen"
                allowFullScreen
                title={v.label || 'Video'}
              />
            </div>
          </div>
        );
      })()}
    </section>
  );
}
