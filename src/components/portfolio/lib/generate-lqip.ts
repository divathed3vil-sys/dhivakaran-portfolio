'use client';

/**
 * Phase 5b.5 — LQIP (Low Quality Image Placeholder) generator.
 *
 * Generates a tiny 16px-wide base64-encoded image from an uploaded File.
 * The LQIP is stored in the `lqip_data` column on the images table + inlined
 * in the JSON response from getPublishedImages(). The Selected Work cells
 * use it as a blurred background placeholder that renders instantly (zero
 * HTTP requests) while the main medium-quality image loads + fades in on top.
 *
 * Format priority: WebP (smaller, ~100-200 bytes) → PNG fallback (~300-500
 * bytes). Both are universally supported by canvas.toDataURL().
 *
 * Per the brief §3.2 + §8.5 (image pipeline): "preserve originals and generate
 * display-aware size variants, encodings. Benchmark codec/file size AND decode
 * performance." The LQIP is the extreme end of display-aware — 16px wide,
 * heavily compressed, inlined. The trade-off is ~200-500 bytes added to the
 * JSON response per image (negligible — 15 images × 500 bytes = 7.5 KB total).
 */

const LQIP_WIDTH = 16; // px — tiny, blurred on display
const LQIP_QUALITY = 0.4; // 0-1 for WebP/PNG

/**
 * Generate a 16px-wide base64 LQIP from an uploaded image File.
 * Returns a data URL string (e.g., "data:image/webp;base64,...").
 *
 * @param file — the uploaded image File
 * @returns — base64 data URL, or empty string if generation failed
 */
export async function generateLQIP(file: File): Promise<string> {
  try {
    // Load the file into an Image element via blob URL (no CORS issues — same-origin blob)
    const img = await loadFileAsImage(file);
    if (!img) return '';

    // Compute proportional height for 16px wide
    const scale = LQIP_WIDTH / img.naturalWidth;
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    // Draw to canvas at 16px wide
    const canvas = document.createElement('canvas');
    canvas.width = LQIP_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, LQIP_WIDTH, height);

    // Try WebP first (smaller), fallback to PNG (universally supported)
    const webp = canvas.toDataURL('image/webp', LQIP_QUALITY);
    if (webp.startsWith('data:image/webp')) return webp;

    // Fallback: PNG (slightly larger but universally supported)
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/** Load a File into an HTMLImageElement via blob URL. */
function loadFileAsImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !URL.createObjectURL) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // free the blob
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
