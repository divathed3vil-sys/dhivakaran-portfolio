'use client';

import { useEffect, useState } from 'react';
import { getVideos } from '@/lib/supabase-data';
import { useBloom, useHeadingRack } from './lib/use-bloom-rack';
import { MediaViewer, type MediaItem } from './media-viewer';
import Image from 'next/image';

type Video = {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  description: string | null;
  priority: number;
  // Phase 5b.4 — process media for hover preview + MediaViewer sidebar
  process_video_url?: string | null;
  process_image_url?: string | null;
  preview_order?: string[] | null;
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
  // Phase 5b.3 — MediaViewer replaces the inline lightbox. Manages the
  // current viewer index (null = closed). Items list built from all videos.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
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
    <>
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
        // REMOVED: contentVisibility: 'auto', — caused Lenis anchor scroll bug (see use-lenis.ts)
        // REMOVED: containIntrinsicSize — paired with contentVisibility above
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
                onClick={() => setViewerIndex(videos.findIndex((x) => x.id === v.id))}
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
                  <Image
                    src={getThumbnail(v)}
                    alt={v.label || 'Video'}
                    width={320}
                    height={180}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.95) contrast(1.05) brightness(0.9)', transition: 'filter 0.4s var(--ease-spring-soft)', userSelect: 'none', WebkitUserDrag: 'none' }}
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
                {/* description — shown below the thumbnail */}
                {v.description && (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-fraunces), serif',
                    lineHeight: 1.4,
                    background: 'var(--canvas)',
                    borderTop: '1px solid var(--rule)',
                  }}>
                    {v.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

      {/* Phase 5b.3 — MediaViewer replaces the inline video lightbox.
          Slides in from the right, full-screen, magazine layout. Prev/next
          navigates through all videos in the section. */}
      {viewerIndex !== null && viewerIndex >= 0 && viewerIndex < videos.length && (() => {
        const items: MediaItem[] = videos.map((v) => ({
          id: v.id,
          type: 'video' as const,
          src: getEmbedUrl(v),
          label: v.label || 'Untitled',
          description: v.description || undefined,
          // Phase 5b.4 — pass process media to the MediaViewer sidebar
          processVideoUrl: v.process_video_url || undefined,
          processImageUrl: v.process_image_url || undefined,
        }));
        return (
          <MediaViewer
            items={items}
            currentIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            onNavigate={(i) => setViewerIndex(i)}
          />
        );
      })()}
    </>
  );
}
