'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAllVideos, addVideo, deleteVideo, reorderImages, bulkUpdateImages, bulkDeleteImages } from '@/lib/supabase-data';

type Video = {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  description: string | null;
  priority: number;
  published: boolean;
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function getThumbnail(video: Video): string {
  if (video.platform === 'youtube') {
    const id = extractYouTubeId(video.url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
  }
  return '';
}

function getEmbedUrl(video: Video): string {
  if (video.platform === 'youtube') {
    const id = extractYouTubeId(video.url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=1&cc_load_policy=0&vq=hd720` : video.url;
  }
  const id = extractVimeoId(video.url);
  return id ? `https://player.vimeo.com/video/${id}?autoplay=1&quality=720p` : video.url;
}

export function VideosTab() {
  // Phase 5b.6 — React Query replaces raw useEffect+setState.
  const queryClient = useQueryClient();
  const { data: vids = [], isLoading: loading } = useQuery<Video[]>({
    queryKey: ['allVideos'],
    queryFn: getAllVideos as () => Promise<Video[]>,
  });
  
  const invalidateVideos = () => queryClient.invalidateQueries({ queryKey: ['allVideos'] });

  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'youtube' | 'vimeo'>('youtube');
  const [label, setLabel] = useState('');
  const [priority, setPriority] = useState(0);
  const [msg, setMsg] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    invalidateVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    await deleteVideo(id);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    invalidateVideos();
  };

  const sortedVideos = useMemo(
    () => [...vids].sort((a, b) => b.priority - a.priority),
    [vids]
  );

  const displayedVideos = useMemo(() => {
    if (!localOrder) return sortedVideos;
    return localOrder
      .map((id) => sortedVideos.find((v) => v.id === id))
      .filter((x): x is Video => !!x);
  }, [sortedVideos, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedVideos.findIndex((v) => v.id === active.id);
    const newIndex = displayedVideos.findIndex((v) => v.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(displayedVideos, oldIndex, newIndex);
    setLocalOrder(newOrder.map((v) => v.id));
    setMsg('Saving new order…');
    // Note: uses reorderImages since the vids table has the same priority column structure.
    // (rename to reorderVideos when the helper is added; for now, the API is identical)
    const { error } = await reorderImages(newOrder.map((v) => v.id));
    if (error) setMsg(`Reorder error: ${error.message}`);
    else { setMsg('Order saved.'); setLocalOrder(null); invalidateVideos(); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(sortedVideos.map((v) => v.id)));
  const clearSelection = () => setSelected(new Set());
  const handleBulkPublish = async (publish: boolean) => {
    if (selected.size === 0) return;
    setMsg(`${publish ? 'Publishing' : 'Hiding'} ${selected.size} vids…`);
    const { error } = await bulkUpdateImages([...selected], { published: publish });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} vids ${publish ? 'published' : 'hidden'}.`); setSelected(new Set()); invalidateVideos(); }
  };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected vids?`)) return;
    setMsg(`Deleting ${selected.size} vids…`);
    const { error } = await bulkDeleteImages([...selected]);
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} vids deleted.`); setSelected(new Set()); invalidateVideos(); }
  };

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
      {/* Phase 5 — visual indicators */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', border: '1.5px solid var(--night-hr)', borderRadius: '4px', background: 'var(--night-soft)', flexWrap: 'wrap' }}>
        <Stat label="VIDEOS" value={sortedVideos.length} />
        <Stat label="SELECTED" value={selected.size} />
        <Stat label="PUBLISHED" value={sortedVideos.filter((v) => v.published).length} />
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => window.open('/', '_blank')} style={{ ...btnStyle, borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Open the live site in a new tab">
            <span style={{ fontSize: '0.85rem' }}>↗</span> Preview Site
          </button>
        </div>
      </div>

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

      {/* Videos list — drag-reorder + multi-select */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="text-mono text-label" style={{ color: 'var(--night-muted)' }}>
            VIDEOS ({sortedVideos.length})
            <span style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>· DRAG ⠿ TO REORDER</span>
          </div>
          {sortedVideos.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {selected.size > 0 ? (
                <>
                  <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>{selected.size} SELECTED</span>
                  <button onClick={() => handleBulkPublish(true)} style={miniBtn} title="Publish selected">↥ Publish</button>
                  <button onClick={() => handleBulkPublish(false)} style={miniBtn} title="Hide selected">↧ Hide</button>
                  <button onClick={handleBulkDelete} style={{ ...miniBtn, borderColor: 'var(--accent)', color: 'var(--accent)' }} title="Delete selected">✕ Delete</button>
                  <button onClick={clearSelection} style={miniBtn} title="Clear selection">✕ Clear</button>
                </>
              ) : (
                <button onClick={selectAll} style={miniBtn} title="Select all">☐ Select All</button>
              )}
            </div>
          )}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedVideos.map((v) => v.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {displayedVideos.map((v) => (
                <SortableVideoCard
                  key={v.id}
                  video={v}
                  selected={selected.has(v.id)}
                  onToggleSelect={() => toggleSelect(v.id)}
                  onPlay={() => setPlaying(v.id)}
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeDragId ? <DragPreview video={displayedVideos.find((v) => v.id === activeDragId)} /> : null}</DragOverlay>
        </DndContext>
        {sortedVideos.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No vids yet.</div>}
      </div>

      {/* Lightbox player — clean YouTube/Vimeo embed */}
      {playing && (() => {
        const v = vids.find((x) => x.id === playing);
        if (!v) return null;
        return (
          <div
            onClick={() => setPlaying(null)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div style={{ width: 'min(90vw, 1280px)', aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
              <iframe src={getEmbedUrl(v)} style={{ width: '100%', height: '100%', border: 0 }} allow="autoplay; fullscreen; encrypted-media" allowFullScreen title={v.label || 'Video'} />
            </div>
          </div>
        );
      })()}

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

function SortableVideoCard({ video, selected, onToggleSelect, onPlay, onDelete }: {
  video: Video;
  selected: boolean;
  onToggleSelect: () => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const thumb = getThumbnail(video);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--night-hr)',
        borderRadius: '4px',
        overflow: 'hidden',
        background: 'var(--night-soft)',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', cursor: 'pointer' }} onClick={onPlay}>
        {thumb ? (
          <img src={thumb} alt={video.label || 'Video'} draggable={false} onContextMenu={(e) => e.preventDefault()} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.3) brightness(0.85)' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--night-muted)', fontSize: '0.8rem' }}>{video.platform}</div>
        )}
        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute', top: '4px', left: '4px', width: '22px', height: '22px',
            background: 'rgba(10,10,10,0.7)', color: 'var(--canvas)', border: 'none', borderRadius: '3px',
            cursor: 'grab', fontSize: '0.85rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Drag to reorder"
          aria-label="Drag handle"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
        {/* multi-select checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: '6px', right: '6px', width: '16px', height: '16px', cursor: 'pointer' }}
          aria-label="Select video"
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--canvas)', opacity: 0.7, pointerEvents: 'none' }}>▶</div>
        <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(10,10,10,0.7)', color: video.published ? 'var(--accent)' : 'var(--night-muted)', padding: '1px 5px', borderRadius: '2px', fontSize: '0.6rem', fontFamily: 'var(--font-mono), monospace' }} title={video.published ? 'Published' : 'Hidden'}>
          {video.published ? '◉' : '○'}
        </span>
      </div>
      <div style={{ padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--canvas)' }}>{video.label || 'Untitled'}</div>
          <div className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>P{video.priority} · {video.platform}</div>
        </div>
        <button onClick={onDelete} style={miniBtn}>✕</button>
      </div>
    </div>
  );
}

function DragPreview({ video }: { video: Video | undefined }) {
  if (!video) return null;
  const thumb = getThumbnail(video);
  return (
    <div style={{ width: '280px', border: '1.5px solid var(--accent)', borderRadius: '4px', overflow: 'hidden', background: 'var(--night-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
        {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--canvas)' }}>{video.label || 'Untitled'}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.65rem' }}>{label}</span>
      <span style={{ color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.95rem', fontWeight: 500 }}>{value}</span>
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
