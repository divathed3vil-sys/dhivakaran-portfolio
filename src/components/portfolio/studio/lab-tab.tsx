'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllImages, uploadImageFile, addImage, deleteImage, updateImage } from '@/lib/supabase-data';

type Image = {
  id: string;
  category_id: string | null;
  public_url: string;
  label: string | null;
  description: string | null;
  priority: number;
  in_lab: boolean;
};

export function LabTab() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgLabel, setImgLabel] = useState('');
  const [imgPriority, setImgPriority] = useState(0);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const imgs = await getAllImages();
    setImages((imgs as Image[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleUpload = async () => {
    if (!imgFile) return;
    setUploading(true);
    setMsg('Uploading…');
    const { publicUrl, error: upErr } = await uploadImageFile(imgFile);
    if (upErr || !publicUrl) { setMsg(`Error: ${upErr}`); setUploading(false); return; }
    const { error } = await addImage({
      category_id: null,
      public_url: publicUrl,
      label: imgLabel || null,
      priority: imgPriority,
      published: true,
      in_lab: true,
    });
    if (error) { setMsg(`Error: ${error.message}`); setUploading(false); return; }
    setImgFile(null); setImgLabel(''); setImgPriority(0);
    setMsg('Image added to Lab.');
    setUploading(false);
    load();
  };

  const handleToggle = async (img: Image) => {
    await updateImage(img.id, { in_lab: !img.in_lab });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await deleteImage(id);
    load();
  };

  if (loading) return <div style={{ color: 'var(--night-muted)' }}>Loading…</div>;

  const labImages = images.filter((i) => i.in_lab);

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '1.25rem', border: '1.5px solid var(--night-hr)', background: 'var(--night-soft)' }}>
        <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>UPLOAD TO LAB</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>File</label>
            <input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Label</label>
            <input value={imgLabel} onChange={(e) => setImgLabel(e.target.value)} placeholder="Optional" style={inputStyle} />
          </div>
          <div>
            <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
            <input type="number" value={imgPriority} onChange={(e) => setImgPriority(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
          </div>
          <button onClick={handleUpload} disabled={uploading || !imgFile} style={{ ...btnStyle, opacity: uploading || !imgFile ? 0.4 : 1 }}>
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
        </div>
      </div>

      <div>
        <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.75rem' }}>
          LAB IMAGES ({labImages.length}) — uncheck to hide from the Visual Lab
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {labImages.map((img) => (
            <div key={img.id} style={{ border: '1.5px solid var(--night-hr)', padding: '0.4rem', background: 'var(--night-soft)' }}>
              <div style={{ width: '100%', aspectRatio: '3/2', backgroundImage: `url(${img.public_url})`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '0.3rem' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--canvas)', marginBottom: '0.2rem' }}>{img.label || 'Untitled'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.6rem' }}>P{img.priority}</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => handleToggle(img)} style={{ ...miniBtn, opacity: img.in_lab ? 1 : 0.4 }} title="Toggle Lab visibility">
                    {img.in_lab ? '◉' : '○'}
                  </button>
                  <button onClick={() => handleDelete(img.id)} style={miniBtn} title="Delete">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {labImages.length === 0 && <div style={{ color: 'var(--night-muted)', fontStyle: 'italic' }}>No lab images yet. Upload above or toggle "Also in Lab" in the Selected Frames tab.</div>}
      </div>

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
