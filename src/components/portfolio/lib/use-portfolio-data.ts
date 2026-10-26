'use client';

import { useEffect, useState } from 'react';
import { getCategories, getPublishedImages, getLabImageUrls } from '@/lib/supabase-data';

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
  // Phase 5b.5 — LQIP base64 data (16px wide, ~200-500 bytes). Generated at
  // upload time via Canvas API. Inlined in the JSON response so the Selected
  // Work cells can render a blurred placeholder instantly (zero HTTP requests).
  // Null for images uploaded before Phase 5b.5 — cells fall back to solid bg.
  lqip_data?: string | null;
  // Phase 5b.4 — process media for the hover preview card.
  // process_video_url: "how I did it" video (heavily compressed, autoplay muted loop)
  // process_image_url: "how I did it" image (e.g., Photoshop layers timeline)
  // preview_order: JSON array like ["description","video","image"] — user-defined
  //   order for the hover card. Items without data are skipped.
  process_video_url?: string | null;
  process_image_url?: string | null;
  preview_order?: string[] | null;
};

/**
 * usePortfolioData — fetches categories + published images from Supabase.
 * Returns null while loading, [] if no data (fall back to hardcoded list).
 */
export function usePortfolioData() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [images, setImages] = useState<Image[] | null>(null);
  const [labUrls, setLabUrls] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cats, imgs, lab] = await Promise.all([
        getCategories(),
        getPublishedImages(),
        getLabImageUrls(),
      ]);
      if (!cancelled) {
        setCategories(cats as Category[]);
        setImages((imgs as Image[]) || []);
        setLabUrls(lab);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, images, labUrls };
}

/** Get images for a category from the fetched data. */
export function getImagesForCategory(images: Image[], categoryId: string | null): Image[] {
  if (!categoryId) return [];
  return images
    .filter((i) => i.category_id === categoryId)
    .sort((a, b) => b.priority - a.priority);
}

/** Supabase image URL with on-the-fly low-res transform (if enabled on the bucket). */
export function lowResUrl(url: string, width = 400): string {
  if (!url) return url;
  // only transform Supabase URLs (not local /images/ paths)
  if (url.includes('supabase.co')) {
    return `${url}?width=${width}&quality=55&resize=contain`;
  }
  return url;
}
