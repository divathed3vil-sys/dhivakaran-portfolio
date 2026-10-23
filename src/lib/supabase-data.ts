import { supabase } from './supabase';

/**
 * Supabase data access — public reads (anon, RLS-protected) + admin mutations
 * (authed session required). Used by both the public portfolio and the Studio.
 */

// ---------- PUBLIC READS ----------

export async function getCategories() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('priority', { ascending: true });
  return data || [];
}

export async function getPublishedImages() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('images')
    .select('*')
    .eq('published', true)
    .order('priority', { ascending: false });
  return data || [];
}

export async function getLabImageUrls(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('images')
    .select('public_url')
    .eq('in_lab', true)
    .eq('published', true)
    .order('priority', { ascending: false });
  return (data || []).map((r) => r.public_url);
}

export async function getVideos() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('videos')
    .select('*')
    .eq('published', true)
    .order('priority', { ascending: false });
  return data || [];
}

export async function getSiteSettings() {
  if (!supabase) return null;
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  return data;
}

// ---------- ADMIN READS (authed — sees all, including unpublished) ----------

export async function getAllImages() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('images')
    .select('*')
    .order('priority', { ascending: false });
  return data || [];
}

export async function getAllVideos() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('videos')
    .select('*')
    .order('priority', { ascending: false });
  return data || [];
}

// ---------- ADMIN MUTATIONS (authed) ----------

export async function addCategory(input: {
  name: string;
  slug: string;
  type: 'book' | 'poster' | 'thumbnail';
  blurb?: string;
  priority?: number;
}) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select()
    .single();
  return { data, error };
}

export async function deleteCategory(id: string) {
  if (!supabase) return { error: 'No Supabase client' };
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error };
}

export async function uploadImageFile(file: File): Promise<{ publicUrl?: string; error?: string }> {
  if (!supabase) return { error: 'No Supabase client' };
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `images/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) return { error: upErr.message };
  const publicUrl = supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
  return { publicUrl };
}

export async function addImage(input: {
  category_id?: string | null;
  public_url: string;
  storage_path?: string;
  label?: string;
  description?: string;
  tools?: string;
  year?: number;
  client?: string;
  priority?: number;
  published?: boolean;
  in_lab?: boolean;
}) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('images')
    .insert(input)
    .select()
    .single();
  return { data, error };
}

export async function updateImage(id: string, updates: Record<string, unknown>) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteImage(id: string) {
  if (!supabase) return { error: 'No Supabase client' };
  const { error } = await supabase.from('images').delete().eq('id', id);
  return { error };
}

export async function addVideo(input: {
  url: string;
  platform: 'youtube' | 'vimeo';
  label?: string;
  description?: string;
  priority?: number;
  published?: boolean;
}) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('videos')
    .insert(input)
    .select()
    .single();
  return { data, error };
}

export async function deleteVideo(id: string) {
  if (!supabase) return { error: 'No Supabase client' };
  const { error } = await supabase.from('videos').delete().eq('id', id);
  return { error };
}

export async function updateSiteSettings(updates: Record<string, unknown>) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('site_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  return { data, error };
}
