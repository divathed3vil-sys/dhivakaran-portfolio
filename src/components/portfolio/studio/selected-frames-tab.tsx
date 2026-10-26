'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
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
import {
  getCategories, getAllImages, addCategory, deleteCategory,
  uploadImageFile, uploadProcessFile, addImage, deleteImage, updateImage,
  reorderImages, bulkUpdateImages, bulkDeleteImages,
} from '@/lib/supabase-data';
import { generateLQIP } from '../lib/generate-lqip';

type Category = { id: string; name: string; slug: string; type: string; blurb: string | null; priority: number; };
type Image = {
  id: string;
  category_id: string | null;
  public_url: string;
  label: string | null;
  description: string | null;
  priority: number;
  published: boolean;
  in_lab: boolean;
  created_at?: string | null;
  lqip_data?: string | null;
  process_video_url?: string | null;
  process_image_url?: string | null;
  preview_order?: string[] | null;
};

export function SelectedFramesTab() {
  // Phase 5b.6 — React Query replaces raw useEffect+setState.
  // Data is cached across tab switches (no refetch), prefetched on Studio open,
  // and mutations automatically invalidate the cache. Query keys match the
  // prefetchQuery calls in studio-overlay.tsx so data is instantly available.
  const queryClient = useQueryClient();
  const { data: cats = [], isLoading: catLoading } = useQuery({
    queryKey: ['cats'],
    queryFn: getCategories,
  });
  const { data: imgs = [], isLoading: imgLoading } = useQuery({
    queryKey: ['allImages'],
    queryFn: getAllImages,
  });
  const loading = catLoading || imgLoading;

  // Helper to invalidate both queries after any mutation
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['cats'] });
    queryClient.invalidateQueries({ queryKey: ['allImages'] });
  };

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'book' | 'poster' | 'thumbnail'>('book');
  const [newCatBlurb, setNewCatBlurb] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [lqipData, setLqipData] = useState<string>('');
  const [imgLabel, setImgLabel] = useState('');
  const [imgDesc, setImgDesc] = useState('');
  const [imgPriority, setImgPriority] = useState(0);
  const [imgInLab, setImgInLab] = useState(true);
  const [processVideoUrl, setProcessVideoUrl] = useState<string>('');
  const [processImageUrl, setProcessImageUrl] = useState<string>('');
  const [previewOrder, setPreviewOrder] = useState<string[]>(['description', 'video', 'image']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [editInLab, setEditInLab] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // Auto-select first category when data loads
  const cats = cats as Category[];
  const imgs = imgs as Image[];
  if (cats.length > 0 && !activeCat) setActiveCat(cats[0].id);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await addCategory({ name: newCatName.trim(), slug: slugify(newCatName), type: newCatType, blurb: newCatBlurb || null, priority: cats.length + 1 });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setNewCatName(''); setNewCatBlurb('');
    setMsg('Category added.');
    invalidateAll();
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !activeCat) return;
    setUploadProgress(0);
    setUploadedUrl(null);
    setLqipData('');
    setProcessVideoUrl('');
    setProcessImageUrl('');
    setPreviewOrder(['description', 'video', 'image']);
    setMsg('Compressing image…');
    // Phase 5b.6 — compress client-side before upload (browser-image-compression).
    // Target: max 800KB, max 1920px. Uses Web Worker so main thread doesn't freeze.
    let compressedFile = file;
    try {
      compressedFile = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
    } catch { /* keep original if compression fails */ }
    setMsg('Uploading image…');
    const progInterval = setInterval(() => setUploadProgress((p) => Math.min(p + 15, 90)), 100);
    const { publicUrl, error: upErr } = await uploadImageFile(compressedFile);
    clearInterval(progInterval);
    setUploadProgress(100);
    if (upErr || !publicUrl) { setMsg(`Upload error: ${upErr}`); setUploadProgress(null); return; }
    setUploadedUrl(publicUrl);
    // Phase 5b.5 — generate LQIP base64 from the compressed file (Canvas API → 16px wide).
    const lqip = await generateLQIP(compressedFile);
    setLqipData(lqip);
    setMsg('Upload complete — fill in the details below, then click Save.');
  };

  // Phase 5b.4 — upload process video/image for the hover preview
  const handleProcessVideoUpload = async (file: File | null) => {
    if (!file) return;
    setMsg('Uploading process video…');
    const { publicUrl, error } = await uploadProcessFile(file);
    if (error || !publicUrl) { setMsg(`Process video upload error: ${error}`); return; }
    setProcessVideoUrl(publicUrl);
    setMsg('Process video uploaded.');
  };

  const handleProcessImageUpload = async (file: File | null) => {
    if (!file) return;
    setMsg('Uploading process image…');
    const { publicUrl, error } = await uploadProcessFile(file);
    if (error || !publicUrl) { setMsg(`Process image upload error: ${error}`); return; }
    setProcessImageUrl(publicUrl);
    setMsg('Process image uploaded.');
  };

  // Phase 5b.4 — reorder the preview items via drag-drop
  const movePreviewItem = (from: number, to: number) => {
    setPreviewOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSaveImage = async () => {
    if (!uploadedUrl || !activeCat) return;
    const { error } = await addImage({
      category_id: activeCat,
      public_url: uploadedUrl,
      label: imgLabel || null,
      description: imgDesc || null,
      priority: imgPriority,
      published: true,
      in_lab: imgInLab,
      lqip_data: lqipData || null,
      // Phase 5b.4 — process media for hover preview
      process_video_url: processVideoUrl || null,
      process_image_url: processImageUrl || null,
      preview_order: previewOrder,
    });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setUploadedUrl(null); setLqipData(''); setImgLabel(''); setImgDesc(''); setImgPriority(0); setImgInLab(true); setUploadProgress(null);
    setProcessVideoUrl(''); setProcessImageUrl(''); setPreviewOrder(['description', 'video', 'image']);
    setMsg('Image saved + published.');
    invalidateAll();
  };

  const handleStartEdit = (img: Image) => {
    setEditingId(img.id);
    setEditLabel(img.label || '');
    setEditDesc(img.description || '');
    setEditPriority(img.priority);
    setEditInLab(img.in_lab);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await updateImage(editingId, { label: editLabel || null, description: editDesc || null, priority: editPriority, in_lab: editInLab });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setEditingId(null);
    setMsg('Image updated.');
    invalidateAll();
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await deleteImage(id);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    invalidateAll();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await deleteCategory(id);
    invalidateAll();
  };

  // Phase 5 — catImages sorted by priority DESC (matches the public site's ordering)
  const catImages = useMemo(
    () => imgs.filter((i) => i.category_id === activeCat).sort((a, b) => b.priority - a.priority),
    [imgs, activeCat]
  );

  // Local-state drag-reorder (optimistic) + persist on drop
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const displayedImages = useMemo(() => {
    if (!localOrder) return catImages;
    // reorder catImages by localOrder
    return localOrder
      .map((id) => catImages.find((i) => i.id === id))
      .filter((x): x is Image => !!x);
  }, [catImages, localOrder]);

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
    else { setMsg('Order saved.'); setLocalOrder(null); invalidateAll(); }
  };

  // Phase 5 — bulk ops
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(catImages.map((i) => i.id)));
  const clearSelection = () => setSelected(new Set());
  const handleBulkPublish = async (publish: boolean) => {
    if (selected.size === 0) return;
    setMsg(`${publish ? 'Publishing' : 'Unpublishing'} ${selected.size} imgs…`);
    const { error } = await bulkUpdateImages([...selected], { published: publish });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} imgs ${publish ? 'published' : 'unpublished'}.`); setSelected(new Set()); invalidateAll(); }
  };
  const handleBulkToggleLab = async (inLab: boolean) => {
    if (selected.size === 0) return;
    setMsg(`${inLab ? 'Adding' : 'Removing'} ${selected.size} imgs ${inLab ? 'to' : 'from'} Lab…`);
    const { error } = await bulkUpdateImages([...selected], { in_lab: inLab });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} imgs ${inLab ? 'added to' : 'removed from'} Lab.`); setSelected(new Set()); invalidateAll(); }
  };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected imgs?`)) return;
    setMsg(`Deleting ${selected.size} imgs…`);
    const { error } = await bulkDeleteImages([...selected]);
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${selected.size} imgs deleted.`); setSelected(new Set()); invalidateAll(); }
  };

  // Phase 5 — visual indicators
  const totalImages = imgs.length;
  const publishedCount = imgs.filter((i) => i.published).length;
  const labCount = imgs.filter((i) => i.in_lab).length;
  const lastModified = imgs
    .map((i) => i.created_at)
    .filter((t): t is string => !!t)
    .sort()
    .reverse()[0];
  const lastModifiedLabel = lastModified
    ? new Date(lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
      {/* Phase 5 — visual indicators (image count, published, lab, last-modified) */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', border: '1.5px solid var(--night-hr)', borderRadius: '4px', background: 'var(--night-soft)', flexWrap: 'wrap' }}>
        <Stat label="TOTAL" value={totalImages} />
        <Stat label="PUBLISHED" value={publishedCount} />
        <Stat label="IN LAB" value={labCount} />
        <Stat label="CATEGORIES" value={cats.length} />
        <Stat label="LAST MODIFIED" value={lastModifiedLabel} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => window.open('/', '_blank')} style={{ ...btnStyle, borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Open the live public site in a new tab">
            <span style={{ fontSize: '0.85rem' }}>↗</span> Preview Site
          </button>
        </div>
      </div>

      {/* Add category */}
      <div style={panelStyle}>
        <div className="text-mono text-label" style={labelStyle}>ADD CATEGORY</div>
        <div style={rowStyle}>
          <div><label style={fieldLabelStyle}>Name</label><input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Book Covers" style={inputStyle} /></div>
          <div><label style={fieldLabelStyle}>Type</label><select value={newCatType} onChange={(e) => setNewCatType(e.target.value as 'book' | 'poster' | 'thumbnail')} style={inputStyle}><option value="book">book</option><option value="poster">poster</option><option value="thumbnail">thumbnail</option></select></div>
          <div style={{ flex: 1, minWidth: '200px' }}><label style={fieldLabelStyle}>Blurb</label><input value={newCatBlurb} onChange={(e) => setNewCatBlurb(e.target.value)} placeholder="Description" style={inputStyle} /></div>
          <button onClick={handleAddCategory} style={btnStyle}>+ Add</button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {cats.map((cat) => (
          <button key={cat.id} onClick={() => { setActiveCat(cat.id); setUploadedUrl(null); setUploadProgress(null); setSelected(new Set()); setLocalOrder(null); }} style={{ ...btnStyle, background: activeCat === cat.id ? 'var(--accent)' : 'transparent', borderColor: activeCat === cat.id ? 'var(--accent)' : 'var(--night-hr)' }}>
            {cat.name}<span onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} style={{ marginLeft: '0.5rem', opacity: 0.6 }}> ✕</span>
          </button>
        ))}
      </div>

      {/* Upload section */}
      {activeCat && (
        <div style={panelStyle}>
          <div className="text-mono text-label" style={labelStyle}>UPLOAD IMAGE</div>
          {!uploadedUrl && uploadProgress === null && (
            <div>
              <label style={{ ...fieldLabelStyle, cursor: 'pointer', display: 'block', padding: '2rem', border: '2px dashed var(--night-hr)', borderRadius: '4px', textAlign: 'center', transition: 'border-color 0.3s' }} onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }} onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }} onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--night-hr)'; handleFileSelect(e.dataTransfer.files?.[0] || null); }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📁</span>
                Click or drag an image to upload
              </label>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
            </div>
          )}
          {uploadProgress !== null && uploadProgress < 100 && (
            <div>
              <div style={{ marginBottom: '0.5rem', color: 'var(--canvas)', fontSize: '0.85rem' }}>Uploading… {uploadProgress}%</div>
              <div style={{ width: '100%', height: '4px', background: 'var(--night-hr)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}
          {uploadedUrl && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <img src={uploadedUrl} alt="Uploaded preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }} />
              </div>
              <div style={rowStyle}>
                <div><label style={fieldLabelStyle}>Label</label><input value={imgLabel} onChange={(e) => setImgLabel(e.target.value)} placeholder="Cover 01" style={inputStyle} /></div>
                <div style={{ flex: 1, minWidth: '180px' }}><label style={fieldLabelStyle}>Description</label><input value={imgDesc} onChange={(e) => setImgDesc(e.target.value)} placeholder="Shows on hover" style={inputStyle} /></div>
                <div><label style={fieldLabelStyle}>Priority</label><input type="number" value={imgPriority} onChange={(e) => setImgPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} /></div>
                <label style={{ color: 'var(--canvas)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><input type="checkbox" checked={imgInLab} onChange={(e) => setImgInLab(e.target.checked)} /> Lab</label>
                <button onClick={handleSaveImage} style={btnStyle}>Save</button>
                <button onClick={() => { setUploadedUrl(null); setUploadProgress(null); setLqipData(''); setProcessVideoUrl(''); setProcessImageUrl(''); setPreviewOrder(['description', 'video', 'image']); }} style={{ ...btnStyle, borderColor: 'var(--night-hr)' }}>Cancel</button>
              </div>

              {/* Phase 5b.4 — Process media for hover preview.
                  Optional: a "how I did it" video + image. Shown when user hovers
                  over the cell on the public site, in the user-defined order below. */}
              <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--night-hr)', borderRadius: '4px' }}>
                <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>PROCESS MEDIA (HOVER PREVIEW)</div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={fieldLabelStyle}>Process Video (≤1MB)</label>
                    <input type="file" accept="video/*" style={{ ...inputStyle, padding: '0.3rem', fontSize: '0.75rem' }} onChange={(e) => handleProcessVideoUpload(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Process Image (PS layers)</label>
                    <input type="file" accept="image/*" style={{ ...inputStyle, padding: '0.3rem', fontSize: '0.75rem' }} onChange={(e) => handleProcessImageUpload(e.target.files?.[0] || null)} />
                  </div>
                </div>
                {processVideoUrl && <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--accent-soft)' }}>✓ Process video uploaded</div>}
                {processImageUrl && <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--accent-soft)' }}>✓ Process image uploaded</div>}
                {/* Preview order — drag-drop reorderable list (up/down buttons for simplicity) */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.3rem' }}>PREVIEW ORDER (drag to reorder)</div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {previewOrder.map((item, i) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {i > 0 && <button onClick={() => movePreviewItem(i, i - 1)} style={{ ...miniBtn, padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} title="Move left">←</button>}
                        <span style={{ padding: '0.2rem 0.5rem', border: '1px solid var(--night-hr)', borderRadius: '2px', fontSize: '0.7rem', color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', background: 'var(--night)' }}>{item}</span>
                        {i < previewOrder.length - 1 && <button onClick={() => movePreviewItem(i, i + 1)} style={{ ...miniBtn, padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} title="Move right">→</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images list — drag-and-drop reorder + multi-select */}
      {activeCat && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)' }}>
              {(cats.find((c) => c.id === activeCat)?.name || '').toUpperCase()} ({catImages.length})
              <span style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>· DRAG ⠿ TO REORDER</span>
            </div>
            {catImages.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {selected.size > 0 ? (
                  <>
                    <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>{selected.size} SELECTED</span>
                    <button onClick={() => handleBulkPublish(true)} style={miniBtn} title="Publish selected">↥ Publish</button>
                    <button onClick={() => handleBulkPublish(false)} style={miniBtn} title="Unpublish selected">↧ Hide</button>
                    <button onClick={() => handleBulkToggleLab(true)} style={miniBtn} title="Add selected to Lab">◉ Lab+</button>
                    <button onClick={() => handleBulkToggleLab(false)} style={miniBtn} title="Remove selected from Lab">○ Lab−</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {displayedImages.map((img) => (
                  <SortableImageCard
                    key={img.id}
                    img={img}
                    selected={selected.has(img.id)}
                    onToggleSelect={() => toggleSelect(img.id)}
                    editing={editingId === img.id}
                    onStartEdit={() => handleStartEdit(img)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={handleSaveEdit}
                    onDelete={() => handleDeleteImage(img.id)}
                    editLabel={editLabel}
                    setEditLabel={setEditLabel}
                    editDesc={editDesc}
                    setEditDesc={setEditDesc}
                    editPriority={editPriority}
                    setEditPriority={setEditPriority}
                    editInLab={editInLab}
                    setEditInLab={setEditInLab}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>{activeDragId ? <DragPreview img={displayedImages.find((i) => i.id === activeDragId)} /> : null}</DragOverlay>
          </DndContext>
          {catImages.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No imgs yet.</div>}
        </div>
      )}

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

// Phase 5 — sortable image card with drag handle (⠿), multi-select checkbox, edit/delete buttons.
// The drag listeners are scoped to the ⠿ handle so the edit/delete/checkbox buttons still work.
function SortableImageCard({
  img, selected, onToggleSelect, editing, onStartEdit, onCancelEdit, onSaveEdit, onDelete,
  editLabel, setEditLabel, editDesc, setEditDesc, editPriority, setEditPriority, editInLab, setEditInLab,
}: {
  img: Image;
  selected: boolean;
  onToggleSelect: () => void;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  setEditLabel: (v: string) => void;
  editDesc: string;
  setEditDesc: (v: string) => void;
  editPriority: number;
  setEditPriority: (v: number) => void;
  editInLab: boolean;
  setEditInLab: (v: boolean) => void;
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
        borderRadius: '4px',
        overflow: 'hidden',
        background: 'var(--night-soft)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {/* drag handle — listeners scoped here so the rest of the card stays click-friendly */}
        <button
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute', top: '4px', left: '4px', width: '24px', height: '24px',
            background: 'rgba(10,10,10,0.7)', color: 'var(--canvas)', border: 'none', borderRadius: '3px',
            cursor: 'grab', fontSize: '0.85rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Drag to reorder"
          aria-label="Drag handle"
        >
          ⠿
        </button>
        {/* multi-select checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          style={{ position: 'absolute', top: '6px', right: '6px', width: '16px', height: '16px', cursor: 'pointer' }}
          aria-label="Select image"
        />
        {/* published + lab indicators */}
        <div style={{ position: 'absolute', bottom: '4px', left: '4px', display: 'flex', gap: '0.2rem' }}>
          <span style={{ background: 'rgba(10,10,10,0.7)', color: img.published ? 'var(--accent)' : 'var(--night-muted)', padding: '1px 5px', borderRadius: '2px', fontSize: '0.6rem', fontFamily: 'var(--font-mono), monospace' }} title={img.published ? 'Published' : 'Hidden'}>
            {img.published ? '◉' : '○'}
          </span>
          {img.in_lab && (
            <span style={{ background: 'rgba(10,10,10,0.7)', color: 'var(--accent-soft)', padding: '1px 5px', borderRadius: '2px', fontSize: '0.6rem', fontFamily: 'var(--font-mono), monospace' }} title="In Lab">
              LAB
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '0.5rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--canvas)', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.label || 'Untitled'}</div>
        {editing ? (
          <div style={{ borderTop: '1px solid var(--night-hr)', paddingTop: '0.5rem', marginTop: '0.3rem' }}>
            <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" style={{ ...inputStyle, marginBottom: '0.3rem', fontSize: '0.75rem' }} />
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, marginBottom: '0.3rem', fontSize: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="number" value={editPriority} onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '50px', fontSize: '0.75rem' }} />
              <label style={{ color: 'var(--canvas)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><input type="checkbox" checked={editInLab} onChange={(e) => setEditInLab(e.target.checked)} size={12} /> Lab</label>
              <button onClick={onSaveEdit} style={{ ...miniBtn, borderColor: 'var(--accent)' }}>Save</button>
              <button onClick={onCancelEdit} style={miniBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>P{img.priority}</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={onStartEdit} style={miniBtn} title="Edit">✎</button>
              <button onClick={onDelete} style={miniBtn} title="Delete">✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// DragOverlay preview — shows the card floating next to the cursor during drag
function DragPreview({ img }: { img: Image | undefined }) {
  if (!img) return null;
  return (
    <div style={{ width: '180px', border: '1.5px solid var(--accent)', borderRadius: '4px', overflow: 'hidden', background: 'var(--night-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--canvas)' }}>{img.label || 'Untitled'}</div>
    </div>
  );
}

// Visual indicator stat block
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.65rem' }}>{label}</span>
      <span style={{ color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.95rem', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = { marginBottom: '1.5rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', borderRadius: '4px', background: 'var(--night-soft)' };
const labelStyle: React.CSSProperties = { color: 'var(--accent)', marginBottom: '0.75rem' };
const rowStyle: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' };
const fieldLabelStyle: React.CSSProperties = { color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle: React.CSSProperties = { background: 'var(--night)', border: '1.5px solid var(--night-hr)', borderRadius: '3px', color: 'var(--canvas)', padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono), monospace', fontSize: '0.85rem', outline: 'none', width: '100%' };
const btnStyle: React.CSSProperties = { padding: '0.4rem 0.9rem', border: '1.5px solid var(--accent)', borderRadius: '3px', background: 'transparent', color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' };
const miniBtn: React.CSSProperties = { ...btnStyle, padding: '0.15rem 0.4rem', fontSize: '0.7rem', border: '1px solid var(--night-hr)', lineHeight: 1, borderRadius: '2px' };
