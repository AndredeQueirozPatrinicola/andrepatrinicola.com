import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import sharp from 'sharp';

import { sha256 } from './lib.mjs';

const script = new URL('./process-media.mjs', import.meta.url).pathname;

test('writes the variants and removes only stale files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'process-media-'));
  try {
    const id = '8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c';
    const png = await sharp({ create: { width: 1000, height: 500, channels: 3, background: '#285aa0' } }).png().toBuffer();
    mkdirSync(join(dir, 'originals'));
    writeFileSync(join(dir, 'originals', id), png);
    writeFileSync(
      join(dir, 'snapshot.json'),
      JSON.stringify({ schemaVersion: 1, articles: [], media: [{ id, sha256: sha256(png), width: 1000, height: 500 }] }),
    );
    mkdirSync(join(dir, 'out'));
    writeFileSync(join(dir, 'out', 'old-image-480.webp'), 'stale');
    writeFileSync(join(dir, 'out', `${id}-480.webp`), 'kept, then rewritten');

    execFileSync(process.execPath, [script, '--snapshot', join(dir, 'snapshot.json'), '--originals', join(dir, 'originals'), '--out', join(dir, 'out')]);

    assert.deepEqual(readdirSync(join(dir, 'out')).sort(), [`${id}-480.webp`, `${id}-960.webp`]);
    assert.equal((await sharp(join(dir, 'out', `${id}-960.webp`)).metadata()).width, 960);
    assert.equal((await sharp(join(dir, 'out', `${id}-480.webp`)).metadata()).format, 'webp');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
