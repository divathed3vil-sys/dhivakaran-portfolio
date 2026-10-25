// Image optimization script — generates AVIF + WebP at 4 width variants per source.
// For Hero image (landing.jpg): also emits pre-blurred variants (Phase 3 — replaces
// per-frame filter:blur(0→8px) on Hero scroll with a cross-fade between sharp + blurred layers).
//
// Run: bun run scripts/optimize-images.ts
//
// Naming: <base>-<width>.<ext>          (sharp variants)
//         <base>-<width>-blur.<ext>     (pre-blurred variants for Hero, 16px Gaussian)
//
// Phase 1: AVIF + responsive picture/next-image + LCP preload
// Phase 3: Pre-rendered blur layer (per brief §2.4 — replaces per-frame GPU blur with cross-fade)
// Old -full/-med/-low variants are removed after the new ones are generated.
import sharp from 'sharp';
import { readdir, rm, stat } from 'fs/promises';
import { join, basename, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'public/images');

// 4 width tiers — AVIF q52 (visually lossless), WebP q72 (fallback), JPEG q80 (legacy fallback)
const WIDTHS = [400, 800, 1280, 1920];
const AVIF_QUALITY = 52;   // AVIF is ~2x more efficient than WebP at same visual quality
const WEBP_QUALITY = 72;   // matches old -med/-full quality
const JPEG_QUALITY = 80;
const JPEG_MAX_WIDTH = 1920;  // cap JPEG fallback at 1920px (already largest width)

// Phase 3: sources that need pre-rendered blur variants (for Hero scroll cross-fade)
// 16px blur at the largest width produces a perceptual "defocus" equivalent to the
// original scroll-driven filter:blur(0→8px) at p=1. Cross-fade sharp→blur over scroll
// progress approximates the focus-pull animation at near-zero per-frame GPU cost.
const BLUR_SOURCES = ['landing'];  // base names that need pre-blurred variants
const BLUR_RADIUS = 16;             // Gaussian sigma — matches original 8px scroll max with buffer

async function main() {
  const files = (await readdir(SRC_DIR)).filter((f) =>
    /\.(png|jpg|jpeg|webp|avif)$/i.test(f)
    // skip existing variants (new naming scheme + old)
    && !/-full|-med|-low/.test(f)
    && !/-(400|800|1280|1920)(-blur)?\.(avif|webp)$/i.test(f)
    && !/-fallback\.jpg$/i.test(f)
  );

  console.log(`Found ${files.length} source images to process`);
  console.log('---');

  let totalAvif = 0;
  let totalWebp = 0;
  let totalJpeg = 0;

  for (const file of files) {
    const src = join(SRC_DIR, file);
    const base = basename(file, extname(file));
    const srcStat = await stat(src);
    console.log(`Processing: ${file} (${(srcStat.size / 1024).toFixed(0)} KB source)`);

    // Load the source once
    const pipeline = sharp(src, { failOn: 'none' }).rotate(); // auto-rotate from EXIF

    // Get source dimensions to skip upscaling
    const metadata = await pipeline.metadata();
    const srcW = metadata.width || 0;
    const srcH = metadata.height || 0;
    console.log(`  source: ${srcW}×${srcH} ${metadata.hasAlpha ? '(has alpha)' : ''}`);

    const needsBlur = BLUR_SOURCES.includes(base);

    for (const width of WIDTHS) {
      // Skip if width exceeds source (no upscaling — preserves original quality)
      if (width > srcW) {
        console.log(`  skip ${width}px (exceeds source ${srcW}px)`);
        continue;
      }

      // AVIF — best compression
      const avifOut = join(SRC_DIR, `${base}-${width}.avif`);
      const avifInfo = await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY, effort: 4 })
        .toFile(avifOut);
      totalAvif += avifInfo.size;
      console.log(`  + ${base}-${width}.avif  (${(avifInfo.size / 1024).toFixed(1)} KB)`);

      // WebP — fallback for older browsers
      const webpOut = join(SRC_DIR, `${base}-${width}.webp`);
      const webpInfo = await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpOut);
      totalWebp += webpInfo.size;
      console.log(`  + ${base}-${width}.webp  (${(webpInfo.size / 1024).toFixed(1)} KB)`);

      // Phase 3: pre-rendered blur variants for Hero
      if (needsBlur) {
        const blurAvifOut = join(SRC_DIR, `${base}-${width}-blur.avif`);
        const blurAvifInfo = await pipeline
          .clone()
          .resize({ width, withoutEnlargement: true })
          .blur(BLUR_RADIUS)
          .avif({ quality: AVIF_QUALITY, effort: 4 })
          .toFile(blurAvifOut);
        totalAvif += blurAvifInfo.size;
        console.log(`  + ${base}-${width}-blur.avif  (${(blurAvifInfo.size / 1024).toFixed(1)} KB) ← pre-blurred`);

        const blurWebpOut = join(SRC_DIR, `${base}-${width}-blur.webp`);
        const blurWebpInfo = await pipeline
          .clone()
          .resize({ width, withoutEnlargement: true })
          .blur(BLUR_RADIUS)
          .webp({ quality: WEBP_QUALITY })
          .toFile(blurWebpOut);
        totalWebp += blurWebpInfo.size;
        console.log(`  + ${base}-${width}-blur.webp  (${(blurWebpInfo.size / 1024).toFixed(1)} KB) ← pre-blurred`);
      }
    }

    // JPEG fallback — progressive, capped at JPEG_MAX_WIDTH
    const jpegOut = join(SRC_DIR, `${base}-fallback.jpg`);
    const jpegWidth = Math.min(JPEG_MAX_WIDTH, srcW);
    const jpegInfo = await pipeline
      .clone()
      .resize({ width: jpegWidth, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toFile(jpegOut);
    totalJpeg += jpegInfo.size;
    console.log(`  + ${base}-fallback.jpg (${(jpegInfo.size / 1024).toFixed(1)} KB, ${jpegWidth}px progressive)`);
    console.log('---');
  }

  // Cleanup: remove old variants (-full, -med, -low) that are no longer referenced
  console.log('Cleaning up old variants (-full, -med, -low)...');
  const allFiles = await readdir(SRC_DIR);
  for (const f of allFiles) {
    if (/-full|-med|-low/.test(f) && /\.(png|jpg|jpeg|webp|avif)$/i.test(f)) {
      await rm(join(SRC_DIR, f));
      console.log(`  - removed ${f}`);
    }
  }

  console.log('---');
  console.log(`Total AVIF:  ${(totalAvif / 1024).toFixed(1)} KB`);
  console.log(`Total WebP:  ${(totalWebp / 1024).toFixed(1)} KB`);
  console.log(`Total JPEG:  ${(totalJpeg / 1024).toFixed(1)} KB`);
  console.log(`GRAND TOTAL: ${((totalAvif + totalWebp + totalJpeg) / 1024).toFixed(1)} KB`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

