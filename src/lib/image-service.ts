'use client';

/**
 * Shared image-ingestion service.
 *
 * Centralizes compression, upload, and LQIP generation so every image-upload
 * path in the Studio uses the same policy. Tab components call this service
 * for the mechanical compress→upload→LQIP pipeline, then handle their own
 * database mutations and UI state separately.
 *
 * Compression policy:
 *  - Maximum longest-side dimension: 1920 px
 *  - Target size: ≤ 800 KB where visually achievable
 *  - Preserves original format (PNG stays PNG, JPEG stays JPEG)
 *  - Does NOT blindly convert to lossy WebP (transparency, pixel accuracy preserved)
 *  - Uses Web Worker so main thread doesn't freeze
 *
 * Compression failure is NEVER silent — the caller receives an error string
 * and the original file is NOT uploaded.
 */

import imageCompression from 'browser-image-compression';
import { uploadImageFile, uploadProcessFile } from './supabase-data';
import { generateLQIP } from '../components/portfolio/lib/generate-lqip';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
} as const;

export type ImageUploadResult = {
  publicUrl?: string;
  lqip?: string;
  error?: string;
};

/**
 * Compress a single image, upload it to Supabase Storage, and generate LQIP.
 *
 * @param file — the raw File from the file picker or drag-drop
 * @param destination — 'images' for main portfolio work, 'process' for process media
 * @returns { publicUrl, lqip?, error? } — LQIP is only generated for 'images' destination
 */
export async function compressUploadAndGenerateLQIP(
  file: File,
  destination: 'images' | 'process' = 'images'
): Promise<ImageUploadResult> {
  // 1. Compress
  let compressedFile = file;
  try {
    compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
  } catch (e) {
    return { error: `Compression failed for ${file.name}: ${(e as Error).message}` };
  }

  // 2. Upload
  const uploadFn = destination === 'images' ? uploadImageFile : uploadProcessFile;
  const { publicUrl, error: upErr } = await uploadFn(compressedFile);
  if (upErr || !publicUrl) {
    return { error: `Upload failed for ${file.name}: ${upErr}` };
  }

  // 3. Generate LQIP (only for main images — process images don't need LQIP)
  let lqip: string | undefined;
  if (destination === 'images') {
    try {
      lqip = await generateLQIP(compressedFile);
    } catch {
      // LQIP generation failure is non-fatal — the image is already uploaded
      lqip = '';
    }
  }

  return { publicUrl, lqip };
}
