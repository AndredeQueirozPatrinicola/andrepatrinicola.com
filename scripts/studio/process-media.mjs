// Re-encodes every published image of the snapshot to WebP in the widths the
// site uses (apps/site/src/domain/blog.ts): rotated by EXIF, metadata
// stripped, never upscaled. Output: apps/site/public/media/<id>-<width>.webp,
// served next to the pages; the originals stay private.
// Usage: node scripts/studio/process-media.mjs [--snapshot path] [--originals dir] [--out dir]
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import sharp from 'sharp';

import { DEFAULT_MEDIA_DIR, DEFAULT_SNAPSHOT, sha256, validateSnapshot, widthsFor } from './lib.mjs';

const { values } = parseArgs({
  options: {
    snapshot: { type: 'string', default: process.env.CONTENT_SNAPSHOT || DEFAULT_SNAPSHOT },
    originals: { type: 'string', default: process.env.STUDIO_MEDIA_DIR || DEFAULT_MEDIA_DIR },
    out: { type: 'string', default: 'apps/site/public/media' },
  },
});

const snapshotPath = resolve(values.snapshot);
const output = resolve(values.out);

// Stale variants (images no longer published) must not survive.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

if (!existsSync(snapshotPath)) {
  console.log('No content snapshot: no images to process.');
  process.exit(0);
}

const snapshot = validateSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8')));
let files = 0;

for (const media of snapshot.media) {
  const original = readFileSync(join(resolve(values.originals), media.id));
  if (sha256(original) !== media.sha256) throw new Error(`Media ${media.id} does not match its SHA-256`);

  for (const width of widthsFor(media.width)) {
    await sharp(original, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(join(output, `${media.id}-${width}.webp`));
    files += 1;
  }
}

console.log(`Processed ${snapshot.media.length} image(s) into ${files} file(s).`);
