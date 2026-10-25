'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getAllImages, uploadImageFile, addImage, deleteImage, updateImage, reorderImages, bulkUpdateImages, bulkDeleteImages } from '@/lib/supabase-data';

type Image = { id: string; public_url: string; label: string | null; priority: number; in_lab: boolean; published: boolean; created_at?: string | null; };

export function LabTab() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [msg, setMsg] = useState('');
  // Phase 5 — drag-drop + multi-select
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const imgs = await getAllImages();
    setImages((imgs as Image[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => load(), 0); return () => clearTimeout(t); }, [load]);

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    setBulkProgress({ current: 0, total: fileArr.length });
    setMsg(`Uploading ${fileArr.length} images…`);

    for (let i = 0; i < fileArr.length; i++) {
      setBulkProgress({ current: i, total: fileArr.length });
      const { publicUrl, error } = await uploadImageFile(fileArr[i]);
      if (error || !publicUrl) { setMsg(`Error on file ${i + 1}: ${error}`); continue; }
      await addImage({ category_id: null, public_url, label: fileArr[i].name.replace(/\.[^.]+$/, ''), priority: 0, published: true, in_lab: true });
    }

    setBulkProgress({ current: fileArr.length, total: fileArr.length });
    setMsg(`${fileArr.length} images uploaded to the Lab.`);
    setTimeout(() => setBulkProgress(null), 1500);
    load();
  };

  const handleToggle = async (img: Image) => { await updateImage(img.id, { in_lab: !img.in_lab }); load(); };
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await deleteImage(id); setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; }); load(); };

  // Phase 5 — lab images sorted by priority DESC (matches public Visual Lab fetch order)
  const labImages = useMemo(
    () => images.filter((i) => i.in_lab).sort((a, b) => b.priority - a.priority),
    [images]
  );

  const displayedImages = useMemo(() => {
    if (!localOrder) return labImages;
    return localOrder
      .map((id) => labImages.find((i) => i.id === id))
      .filter((x): x is Image => !!x);
  }, [labImages, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedImages.findIndex((i) => i.id === active.id);
    const newIndex = displayedImages.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(displayedImages, oldIndex, newIndex);
    setLocalOrder(newOrder.map((i) => i.id));
    setMsg('Saving new order…');
    const { error } = await reorderImages(newOrder.map((i) => i.id));
    if (error) setMsg(`Reorder error: ${error.message}`);
    else { setMsg('Order saved.'); setLocalOrder(null); load(); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(labImages.map((i) => i.id)));
  const clearSelection = () => setSelected(new Set());
  const handleBulkPublish = async (publish: boolean) => {
    if (selected.size === 0) return;
    setMsg(`${publish ? 'Publishing' : 'Hiding'} ${selected.size} images…`);
    const { error } = await bulkUpdateImages([...selected], { published: publish });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} images ${publish ? 'published' : 'hidden'}.`); setSelected(new Set()); load(); }
  };
  const handleBulkRemoveFromLab = async () => {
    if (selected.size === 0) return;
    setMsg(`Removing ${selected.size} images from Lab…`);
    const { error } = await bulkUpdateImages([...selected], { in_lab: false });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} images removed from Lab.`); setSelected(new Set()); load(); }
  };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected images?`)) return;
    setMsg(`Deleting ${selected.size} images…`);
    const { error } = await bulkDeleteImages([...selected]);
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} images deleted.`); setSelected(new Set()); load(); }
  };

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
      {/* Phase 5 — visual indicators */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', border: '1.5px solid var(--night-hr)', borderRadius: '4px', background: 'var(--night-soft)', flexWrap: 'wrap' }}>
        <Stat label="LAB IMAGES" value={labImages.length} />
        <Stat label="SELECTED" value={selected.size} />
        <Stat label="PUBLISHED" value={labImages.filter((i) => i.published).length} />
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => window.open('/', '_blank')} style={{ ...btnStyle, borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Open the live Visual Lab in a new tab">
            <span style={{ fontSize: '0.85rem' }}>↗</span> Preview Site
          </button>
        </div>
      </div>

      {/* Bulk upload */}
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', borderRadius: '4px', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>BULK UPLOAD TO LAB</div>
        <label
          style={{ display: 'block', padding: '2rem', border: '2px dashed var(--night-hr)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s', color: 'var(--night-muted)', fontSize: '0.9rem' }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--night-hr)'; handleBulkUpload(e.dataTransfer.files); }}
        >
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📁</span>
          Drag multiple images here or click to select
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleBulkUpload(e.target.files)} />
        </label>
        {bulkProgress && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ color: 'var(--canvas)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              Uploading {bulkProgress.current} / {bulkProgress.total}…
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--night-hr)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Lab images list — drag-reorder + multi-select */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="text-mono text-label" style={{ color: 'var(--night-muted)' }}>
            LAB IMAGES ({labImages.length}) — uncheck to hide from the Visual Lab
            <span style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>· DRAG ⠿ TO REORDER</span>
          </div>
          {labImages.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {selected.size > 0 ? (
                <>
                  <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>{selected.size} SELECTED</span>
                  <button onClick={() => handleBulkPublish(true)} style={miniBtn} title="Publish selected">↥ Publish</button>
                  <button onClick={() => handleBulkPublish(false)} style={miniBtn} title="Hide selected">↧ Hide</button>
                  <button onClick={handleBulkRemoveFromLab} style={miniBtn} title="Remove selected from Lab">○ Lab−</button>
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
          <SortableContext items={displayedImages.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {displayedImages.map((img) => (
                <SortableLabCard
                  key={img.id}
                  img={img}
                  selected={selected.has(img.id)}
                  onToggleSelect={() => toggleSelect(img.id)}
                  onToggleLab={() => handleToggle(img)}
                  onDelete={() => handleDelete(img.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeDragId ? <DragPreview img={displayedImages.find((i) => i.id === activeDragId)} /> : null}</DragOverlay>
        </DndContext>
        {labImages.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No lab images yet. Upload above.</div>}
      </div>

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

function SortableLabCard({ img, selected, onToggleSelect, onToggleLab, onDelete }: {
  img: Image;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleLab: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--night-hr)',
        borderRadius: '3px',
        overflow: 'hidden',
        background: 'var(--night-soft)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
        >
          ⠿
        </button>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          style={{ position: 'absolute', top: '6px', right: '6px', width: '16px', height: '16px', cursor: 'pointer' }}
          aria-label="Select image"
        />
        <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(10,10,10,0.7)', color: img.published ? 'var(--accent)' : 'var(--night-muted)', padding: '1px 5px', borderRadius: '2px', fontSize: '0.6rem', fontFamily: 'var(--font-mono), monospace' }} title={img.published ? 'Published' : 'Hidden'}>
          {img.published ? '◉' : '○'}
        </span>
      </div>
      <div style={{ padding: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--canvas)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{img.label || 'Untitled'}</span>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button onClick={onToggleLab} style={{ ...miniBtn, opacity: img.in_lab ? 1 : 0.4 }} title="Toggle Lab">{img.in_lab ? '◉' : '○'}</button>
          <button onClick={onDelete} style={miniBtn} title="Delete">✕</button>
        </div>
      </div>
    </div>
  );
}

function DragPreview({ img }: { img: Image | undefined }) {
  if (!img) return null;
  return (
    <div style={{ width: '140px', border: '1.5px solid var(--accent)', borderRadius: '3px', overflow: 'hidden', background: 'var(--night-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ padding: '0.4rem', fontSize: '0.7rem', color: 'var(--canvas)' }}>{img.label || 'Untitled'}</div>
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

const btnStyle: React.CSSProperties = { padding: '0.4rem 0.9rem', border: '1.5px solid var(--accent)', borderRadius: '3px', background: 'transparent', color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' };
const miniBtn: React.CSSProperties = { ...btnStyle, padding: '0.15rem 0.4rem', fontSize: '0.7rem', border: '1px solid var(--night-hr)', lineHeight: 1, borderRadius: '2px' };
