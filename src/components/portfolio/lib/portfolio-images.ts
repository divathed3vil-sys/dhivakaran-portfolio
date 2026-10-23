/**
 * Shared portfolio image list.
 *
 * ONLY images uploaded via the Studio (Supabase Storage) appear here.
 * No hardcoded/AI-generated placeholder images.
 *
 * The public site fetches from Supabase at runtime (see use-portfolio-data.ts).
 * LAB_IMAGE_SRCS is empty — the Visual Lab fetches from Supabase on open.
 */

export type ImageCategory = 'book' | 'poster' | 'thumbnail' | 'other';

export type PortfolioImage = {
  src: string;
  category: ImageCategory;
  label: string;
};

// Empty — all images come from Supabase (uploaded via the Studio)
export const PORTFOLIO_IMAGES: PortfolioImage[] = [];

export const CATEGORY_LABELS: Record<ImageCategory, string> = {
  book: 'Book Covers',
  poster: 'Posters',
  thumbnail: 'Thumbnails',
  other: 'Other',
};

export const CATEGORY_BLURBS: Record<string, string> = {
  book: 'Cover designs and key art for printed and digital books.',
  poster: 'Poster designs - print, key art, and promotional.',
  thumbnail: 'Youtube thumbnails - click-through composition.',
  other: '',
};

// Empty — the Visual Lab fetches lab image URLs from Supabase on open
export const LAB_IMAGE_SRCS: string[] = [];
