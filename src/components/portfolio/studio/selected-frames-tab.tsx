'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCategories,
  getPublishedImages,
  addCategory,
  deleteCategory,
  uploadImageFile,
  addImage,
  deleteImage,
  updateImage,
} from '@/lib/supabase-data';

type Category = {
  id: string;
  name: string;
  slug: string;
  type: string;
  blurb: string | null;
  priority: number;
};

type Image = {
  id: string;
  category_id: string | null;
  public_url: string;
  label: string | null;
  description: string | null;
  priority: number;
  published: boolean;
  in_lab: boolean;
};

/**
 * SelectedFramesTab — manage categories + images for the portfolio.
 * Add/delete categories, upload images (to Supabase Storage), set priority,
 * toggle published/in_lab, delete images. Changes appear on the public site
 * (Phase 4 wiring) immediately after publish.
 */
export function SelectedFramesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // new category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'book' | 'poster' | 'thumbnail'>('book');
  const [newCatBlurb, setNewCatBlurb] = useState('');

  // new image form (per active category)
  const [imgLabel, setImgLabel] = useState('');
  const [imgPriority, setImgPriority] = useState(0);
  const [imgInLab, setImgInLab] = useState(true);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, imgs] = await Promise.all([getCategories(), getPublishedImages()]);
    setCategories(cats as Category[]);
    setImages((imgs as Image[]) || []);
    if (cats.length > 0 && !activeCat) setActiveCat((cats[0] as Category).id);
    setLoading(false);
  }, [activeCat]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await addCategory({
      name: newCatName.trim(),
      slug: slugify(newCatName),
      type: newCatType,
      blurb: newCatBlurb || null,
      priority: categories.length + 1,
    });
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setNewCatName(''); setNewCatBlurb('');
    setMsg('Category added.');
    load();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Images will remain but lose their category.')) return;
    await deleteCategory(id);
    load();
  };

  const handleUploadImage = async () => {
    if (!imgFile || !activeCat) return;
    setUploading(true);
    setMsg('Uploading…');
    const { publicUrl, error: upErr } = await uploadImageFile(imgFile);
    if (upErr || !publicUrl) {
      setMsg(`Upload error: ${upErr}`);
      setUploading(false);
      return;
    }
    const { error } = await addImage({
      category_id: activeCat,
      public_url: publicUrl,
      label: imgLabel || null,
      priority: imgPriority,
      published: true,
      in_lab: imgInLab,
    });
    if (error) { setMsg(`DB error: ${error.message}`); setUploading(false); return; }
    setImgFile(null); setImgLabel(''); setImgPriority(0);
    setMsg('Image added + published.');
    setUploading(false);
    load();
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await deleteImage(id);
    load();
  };

  const handleToggleLab = async (img: Image) => {
    await updateImage(img.id, { in_lab: !img.in_lab });
    load();
  };

  const catImages = images.filter((i) => i.category_id === activeCat);

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
      {/* Add category */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>ADD CATEGORY</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Name</label>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Book Covers" style={inputStyle} />
          </div>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Type</label>
            <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as 'book' | 'poster' | 'thumbnail')} style={inputStyle}>
              <option value="book">book</option>
              <option value="poster">poster</option>
              <option value="thumbnail">thumbnail</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Blurb</label>
            <input value={newCatBlurb} onChange={(e) => setNewCatBlurb(e.target.value)} placeholder="Description" style={inputStyle} />
          </div>
          <button onClick={handleAddCategory} style={btnStyle}>+ Add</button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            style={{
              ...btnStyle,
              background: activeCat === cat.id ? 'var(--accent)' : 'transparent',
              color: activeCat === cat.id ? 'var(--canvas)' : 'var(--canvas)',
              borderColor: activeCat === cat.id ? 'var(--accent)' : 'var(--night-hr)',
            }}
          >
            {cat.name}
            <span onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} style={{ marginLeft: '0.5rem', opacity: 0.6 }}>✕</span>
          </button>
        ))}
      </div>

      {/* Image upload for active category */}
      {activeCat && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
          <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>UPLOAD IMAGE</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>File</label>
              <input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} style={{ ...inputStyle, width: 'auto' }} />
            </div>
            <div>
              <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Label</label>
              <input value={imgLabel} onChange={(e) => setImgLabel(e.target.value)} placeholder="Cover 01" style={inputStyle} />
            </div>
            <div>
              <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
              <input type="number" value={imgPriority} onChange={(e) => setImgPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
            </div>
            <label style={{ color: 'var(--canvas)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="checkbox" checked={imgInLab} onChange={(e) => setImgInLab(e.target.checked)} /> Also in Lab
            </label>
            <button onClick={handleUploadImage} disabled={uploading || !imgFile} style={{ ...btnStyle, opacity: uploading || !imgFile ? 0.4 : 1 }}>
              {uploading ? 'Uploading…' : '+ Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Images in active category */}
      {activeCat && (
        <div>
          <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.75rem' }}>
            IMAGES IN {(categories.find((c) => c.id === activeCat)?.name || '').toUpperCase()} ({catImages.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {catImages.map((img) => (
              <div key={img.id} style={{ border: '1.5px solid var(--night-hr)', padding: '0.5rem', background: 'var(--night-soft)' }}>
                <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '0.4rem' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--canvas)', marginBottom: '0.3rem' }}>{img.label || 'Untitled'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>P{img.priority}</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => handleToggleLab(img)} style={{ ...miniBtn, opacity: img.in_lab ? 1 : 0.4 }} title="Toggle Lab">
                      {img.in_lab ? '◉' : '○'}
                    </button>
                    <button onClick={() => handleDeleteImage(img.id)} style={miniBtn} title="Delete">✕</button>
                  </div>
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
