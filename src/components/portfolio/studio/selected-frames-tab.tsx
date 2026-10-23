'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCategories, getAllImages, addCategory, deleteCategory,
  uploadImageFile, addImage, deleteImage, updateImage,
} from '@/lib/supabase-data';

type Category = { id: string; name: string; slug: string; type: string; blurb: string | null; priority: number; };
type Image = { id: string; category_id: string | null; public_url: string; label: string | null; description: string | null; priority: number; published: boolean; in_lab: boolean; };

export function SelectedFramesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'book' | 'poster' | 'thumbnail'>('book');
  const [newCatBlurb, setNewCatBlurb] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [imgLabel, setImgLabel] = useState('');
  const [imgDesc, setImgDesc] = useState('');
  const [imgPriority, setImgPriority] = useState(0);
  const [imgInLab, setImgInLab] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [editInLab, setEditInLab] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, imgs] = await Promise.all([getCategories(), getAllImages()]);
    setCategories(cats as Category[]);
    setImages((imgs as Image[]) || []);
    if (cats.length > 0 && !activeCat) setActiveCat((cats[0] as Category).id);
    setLoading(false);
  }, [activeCat]);

  useEffect(() => { const t = setTimeout(() => load(), 0); return () => clearTimeout(t); }, [load]);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await addCategory({ name: newCatName.trim(), slug: slugify(newCatName), type: newCatType, blurb: newCatBlurb || null, priority: categories.length + 1 });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setNewCatName(''); setNewCatBlurb('');
    setMsg('Category added.');
    load();
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !activeCat) return;
    setUploadProgress(0);
    setUploadedUrl(null);
    setMsg('Uploading image…');
    // simulate progress
    const progInterval = setInterval(() => setUploadProgress((p) => Math.min(p + 15, 90)), 100);
    const { publicUrl, error: upErr } = await uploadImageFile(file);
    clearInterval(progInterval);
    setUploadProgress(100);
    if (upErr || !publicUrl) { setMsg(`Upload error: ${upErr}`); setUploadProgress(null); return; }
    setUploadedUrl(publicUrl);
    setMsg('Upload complete — fill in the details below, then click Save.');
  };

  const handleSaveImage = async () => {
    if (!uploadedUrl || !activeCat) return;
    const { error } = await addImage({ category_id: activeCat, public_url: uploadedUrl, label: imgLabel || null, description: imgDesc || null, priority: imgPriority, published: true, in_lab: imgInLab });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setUploadedUrl(null); setImgLabel(''); setImgDesc(''); setImgPriority(0); setImgInLab(true); setUploadProgress(null);
    setMsg('Image saved + published.');
    load();
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
    load();
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await deleteImage(id);
    load();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await deleteCategory(id);
    load();
  };

  const catImages = images.filter((i) => i.category_id === activeCat);

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
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
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => { setActiveCat(cat.id); setUploadedUrl(null); setUploadProgress(null); }} style={{ ...btnStyle, background: activeCat === cat.id ? 'var(--accent)' : 'transparent', borderColor: activeCat === cat.id ? 'var(--accent)' : 'var(--night-hr)' }}>
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
                <button onClick={() => { setUploadedUrl(null); setUploadProgress(null); }} style={{ ...btnStyle, borderColor: 'var(--night-hr)' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images list */}
      {activeCat && (
        <div>
          <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.75rem' }}>
            {(categories.find((c) => c.id === activeCat)?.name || '').toUpperCase()} ({catImages.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {catImages.map((img) => (
              <div key={img.id} style={{ border: '1.5px solid var(--night-hr)', borderRadius: '4px', overflow: 'hidden', background: 'var(--night-soft)' }}>
                <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--canvas)', marginBottom: '0.3rem' }}>{img.label || 'Untitled'}</div>
                  {editingId === img.id ? (
                    <div style={{ borderTop: '1px solid var(--night-hr)', paddingTop: '0.5rem', marginTop: '0.3rem' }}>
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" style={{ ...inputStyle, marginBottom: '0.3rem', fontSize: '0.75rem' }} />
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, marginBottom: '0.3rem', fontSize: '0.75rem' }} />
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input type="number" value={editPriority} onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '50px', fontSize: '0.75rem' }} />
                        <label style={{ color: 'var(--canvas)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><input type="checkbox" checked={editInLab} onChange={(e) => setEditInLab(e.target.checked)} size={12} /> Lab</label>
                        <button onClick={handleSaveEdit} style={{ ...miniBtn, borderColor: 'var(--accent)' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={miniBtn}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>P{img.priority} {img.in_lab ? '◉' : '○'}</span>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => handleStartEdit(img)} style={miniBtn} title="Edit">✎</button>
                        <button onClick={() => handleDeleteImage(img.id)} style={miniBtn} title="Delete">✕</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {catImages.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No images yet.</div>}
        </div>
      )}

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
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
