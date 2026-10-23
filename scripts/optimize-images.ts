// Image optimization script — generates 3 quality tiers for each image.
// Run: bun run scripts/optimize-images.ts
// Lab tiles use -low (400px, q55), About uses -med (800px, q72), Hero uses -full (1600px, q82).
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'public/images');
const TIERS = [
  { suffix: '-full', width: 1600, quality: 82 },
  { suffix: '-med', width: 800, quality: 72 },
  { suffix: '-low', width: 400, quality: 55 },
];

async function main() {
  const files = (await readdir(SRC_DIR)).filter((f) =>
    /\.(png|jpg|jpeg|webp)$/i.test(f) && !/-full|-med|-low/.test(f)
  );
  console.log(`Found ${files.length} source images`);
  for (const file of files) {
    const src = join(SRC_DIR, file);
    const base = basename(file, extname(file));
    for (const tier of TIERS) {
      const out = join(SRC_DIR, `${base}${tier.suffix}.webp`);
      await sharp(src)
        .resize({ width: tier.width, withoutEnlargement: true })
        .webp({ quality: tier.quality })
        .toFile(out);
      console.log(`  + ${base}${tier.suffix}.webp (${tier.width}px q${tier.quality})`);
    }
  }
  console.log('Done.');
}
main().catch(console.error);
