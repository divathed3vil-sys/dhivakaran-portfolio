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
