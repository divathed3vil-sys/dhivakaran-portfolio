/**
 * Shared portfolio image list.
 *
 * BOTH the Selected Work section and the Visual Lab read from this list.
 * To add a new image: drop the file in /public/images/ and add an entry here.
 * It will automatically appear in both Selected Work (grouped by category)
 * and the Visual Lab (in the infinite drag field).
 *
 * Images are shown at their OWN aspect ratio — never cropped.
 */
export type ImageCategory = 'book' | 'poster' | 'thumbnail' | 'other';

export type PortfolioImage = {
  src: string;
  category: ImageCategory;
  label: string;
};

export const PORTFOLIO_IMAGES: PortfolioImage[] = [
  // Placeholders — replace/add real work below.
  // Book covers, posters, and thumbnails added here will flow into both
  // the Selected Work grids AND the Visual Lab automatically.
  // -med.webp = enough quality for Selected Work display
  // -low.webp = low-res for the Visual Lab (fast)
  { src: '/images/portrait-med.webp', category: 'other', label: 'Portrait' },
  { src: '/images/atmosphere-med.webp', category: 'other', label: 'Atmosphere' },
  { src: '/images/object-lens-med.webp', category: 'other', label: 'Aperture' },
];

export const CATEGORY_LABELS: Record<ImageCategory, string> = {
  book: 'Book Covers',
  poster: 'Posters',
  thumbnail: 'Thumbnails',
  other: 'Other',
};

export const CATEGORY_BLURBS: Record<ImageCategory, string> = {
  book: 'Cover designs and key art for printed and digital books.',
  poster: 'Poster designs - print, key art, and promotional.',
  poster_alt: 'Poster designs - print, key art, and promotional.',
  thumbnail: 'Youtube thumbnails - click-through composition.',
  other: '',
};

/** All image srcs for the Visual Lab (low-res for fast rendering). */
export const LAB_IMAGE_SRCS: string[] = [
  '/images/portrait-low.webp',
  '/images/atmosphere-low.webp',
  '/images/object-lens-low.webp',
];
