'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllImages, uploadImageFile, addImage, deleteImage, updateImage } from '@/lib/supabase-data';

type Image = { id: string; public_url: string; label: string | null; priority: number; in_lab: boolean; };

export function LabTab() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [msg, setMsg] = useState('');

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
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await deleteImage(id); load(); };

  const labImages = images.filter((i) => i.in_lab);

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  return (
    <div>
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

      {/* Lab images list */}
      <div>
        <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.75rem' }}>
          LAB IMAGES ({labImages.length}) — uncheck to hide from the Visual Lab
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {labImages.map((img) => (
            <div key={img.id} style={{ border: '1.5px solid var(--night-hr)', borderRadius: '3px', overflow: 'hidden', background: 'var(--night-soft)' }}>
              <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--canvas)' }}>{img.label || 'Untitled'}</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => handleToggle(img)} style={{ ...miniBtn, opacity: img.in_lab ? 1 : 0.4 }} title="Toggle Lab">{img.in_lab ? '◉' : '○'}</button>
                  <button onClick={() => handleDelete(img.id)} style={miniBtn} title="Delete">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {labImages.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No lab images yet. Upload above.</div>}
      </div>

      {msg && <div style={{ marginTop: '1rem', color: 'var(--accent-soft)', fontSize: '0.85rem' }}>{msg}</div>}
    </div>
  );
}

const miniBtn: React.CSSProperties = { padding: '0.15rem 0.4rem', border: '1px solid var(--night-hr)', borderRadius: '2px', background: 'transparent', color: 'var(--canvas)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', cursor: 'pointer', lineHeight: 1 };
