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
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: false,
  });
  if (upErr) return { error: upErr.message };
  const publicUrl = supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
  return { publicUrl };
}

// Phase 5b.4 — upload process media (video or image) for the hover preview.
// Stored in the same 'portfolio' bucket under a 'process/' prefix for organization.
// Returns the public URL to store in process_video_url / process_image_url.
export async function uploadProcessFile(file: File): Promise<{ publicUrl?: string; error?: string }> {
  if (!supabase) return { error: 'No Supabase client' };
  const ext = file.name.split('.').pop() || 'bin';
  const path = `process/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, {
    cacheControl: 'public, max-age=31536000, immutable',
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
  // Phase 5b.5 — LQIP base64 data (16px wide, ~200-500 bytes). Generated at
  // upload time via Canvas API in the Studio. Stored in the images table.
  lqip_data?: string | null;
  // Phase 5b.4 — process media for the hover preview card.
  process_video_url?: string | null;
  process_image_url?: string | null;
  preview_order?: string[] | null;
}) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('images')
    .insert(input)
    .select()
    .single();
  // Phase 5b.5 + 5b.4 — graceful fallback: if any of the new columns don't
  // exist (user hasn't run the SQL migrations yet), retry without them so the
  // upload still succeeds. The public site just won't show LQIP / process
  // media for that image until the migrations are run + image is re-uploaded.
  if (error && (
    (input.lqip_data !== undefined && /lqip_data/i.test(error.message || '')) ||
    (input.process_video_url !== undefined && /process_video_url/i.test(error.message || '')) ||
    (input.process_image_url !== undefined && /process_image_url/i.test(error.message || '')) ||
    (input.preview_order !== undefined && /preview_order/i.test(error.message || ''))
  )) {
    const { lqip_data: _l, process_video_url: _v, process_image_url: _i, preview_order: _p, ...rest } = input;
    const { data: retryData, error: retryError } = await supabase
      .from('images')
      .insert(rest)
      .select()
      .single();
    return { data: retryData, error: retryError };
  }
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
  // Graceful fallback: if any new columns don't exist (migrations not run),
  // retry without them so the update still succeeds.
  if (error && /lqip_data|process_video_url|process_image_url|preview_order/i.test(error.message || '')) {
    const filtered = { ...updates };
    delete filtered.lqip_data;
    delete filtered.process_video_url;
    delete filtered.process_image_url;
    delete filtered.preview_order;
    const { data: retryData, error: retryError } = await supabase
      .from('images')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    return { data: retryData, error: retryError };
  }
  return { data, error };
}

export async function deleteImage(id: string) {
  if (!supabase) return { error: 'No Supabase client' };
  const { error } = await supabase.from('images').delete().eq('id', id);
  return { error };
}

// Phase 5 — bulk operations for Studio. Each is idempotent + atomic-ish
// (Supabase doesn't have true transactions across rows, but we batch the calls
// and surface the first error encountered).

/**
 * Reorder images by passing an ordered array of IDs. The first ID gets the
 * HIGHEST priority (so it sorts first when fetched DESC). All other images
 * get priorities assigned by their index in the array.
 */
export async function reorderImages(orderedIds: string[]) {
  if (!supabase) return { error: 'No Supabase client' };
  const highest = orderedIds.length;
  const updates = orderedIds.map((id, index) =>
    supabase.from('images').update({ priority: highest - index }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  return { error: firstError?.error };
}

/**
 * Bulk-update many images with the same patch (e.g. bulk publish, bulk toggle
 * in_lab). Returns first error encountered.
 */
export async function bulkUpdateImages(ids: string[], updates: Record<string, unknown>) {
  if (!supabase) return { error: 'No Supabase client' };
  if (ids.length === 0) return { error: 'No IDs provided' };
  const calls = ids.map((id) =>
    supabase.from('images').update(updates).eq('id', id).select().single()
  );
  const results = await Promise.all(calls);
  const firstError = results.find((r) => r.error);
  return { error: firstError?.error };
}

/**
 * Bulk-delete many images. Returns first error encountered.
 */
export async function bulkDeleteImages(ids: string[]) {
  if (!supabase) return { error: 'No Supabase client' };
  if (ids.length === 0) return { error: 'No IDs provided' };
  const calls = ids.map((id) => supabase.from('images').delete().eq('id', id));
  const results = await Promise.all(calls);
  const firstError = results.find((r) => r.error);
  return { error: firstError?.error };
}

export async function addVideo(input: {
  url: string;
  platform: 'youtube' | 'vimeo';
  label?: string;
  description?: string;
  priority?: number;
  published?: boolean;
  // Phase 5b.4 — process media for the hover preview card.
  process_video_url?: string | null;
  process_image_url?: string | null;
  preview_order?: string[] | null;
}) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('videos')
    .insert(input)
    .select()
    .single();
  // Graceful fallback: if process media columns don't exist (migration not run),
  // retry without them so the upload still succeeds.
  if (error && (input.process_video_url !== undefined || input.process_image_url !== undefined || input.preview_order !== undefined) && /process_video_url|process_image_url|preview_order/i.test(error.message || '')) {
    const { process_video_url: _v, process_image_url: _i, preview_order: _p, ...rest } = input;
    const { data: retryData, error: retryError } = await supabase
      .from('videos')
      .insert(rest)
      .select()
      .single();
    return { data: retryData, error: retryError };
  }
  return { data, error };
}

export async function deleteVideo(id: string) {
  if (!supabase) return { error: 'No Supabase client' };
  const { error } = await supabase.from('videos').delete().eq('id', id);
  return { error };
}

// Phase 5b.7b — update a video (label, description, process media, preview order)
export async function updateVideo(id: string, updates: Record<string, unknown>) {
  if (!supabase) return { error: 'No Supabase client' };
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  // Graceful fallback: if process media columns don't exist (migration not run),
  // retry without them so the update still succeeds.
  if (error && /process_video_url|process_image_url|preview_order/i.test(error.message || '')) {
    const filtered = { ...updates };
    delete filtered.process_video_url;
    delete filtered.process_image_url;
    delete filtered.preview_order;
    const { data: retryData, error: retryError } = await supabase
      .from('videos')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    return { data: retryData, error: retryError };
  }
  return { data, error };
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
