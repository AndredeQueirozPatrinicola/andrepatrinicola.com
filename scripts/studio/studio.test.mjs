import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { apiBase, imageWidths, isSecureUrl, isUuid, validateSnapshot, widthsFor, withoutMediaUrls } from './lib.mjs';
import { reportBody } from './report-deployment.mjs';

test('image widths match the site', () => {
  const domain = readFileSync(new URL('../../apps/site/src/domain/blog.ts', import.meta.url), 'utf8');
  const match = /imageWidths = \[([^\]]+)\]/.exec(domain);
  assert.deepEqual(match[1].split(',').map((value) => Number(value.trim())), imageWidths);
});

test('never upscales', () => {
  assert.deepEqual(widthsFor(2400), [480, 960, 1200, 1600]);
  assert.deepEqual(widthsFor(1000), [480, 960]);
  assert.deepEqual(widthsFor(300), [300]);
});

test('accepts only deployment ids', () => {
  assert.equal(isUuid('8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c'), true);
  assert.equal(isUuid('x; rm -rf /'), false);
  assert.equal(isUuid(undefined), false);
});

test('requires https for the API', () => {
  assert.equal(apiBase('https://api.example.com/'), 'https://api.example.com');
  assert.equal(apiBase('http://localhost:3000'), 'http://localhost:3000');
  assert.throws(() => apiBase('http://api.example.com'));
  assert.throws(() => apiBase(''));
});

test('downloads media only over https, or from this machine', () => {
  assert.equal(isSecureUrl('https://bucket.s3.amazonaws.com/media/x?X-Amz-Signature=s'), true);
  assert.equal(isSecureUrl('http://localhost:3001/_s3/studio-local/media/x'), true);
  assert.equal(isSecureUrl('http://127.0.0.1:3001/x'), true);
  assert.equal(isSecureUrl('http://bucket.s3.amazonaws.com/media/x'), false);
  assert.equal(isSecureUrl('file:///etc/passwd'), false);
  assert.equal(isSecureUrl('not a url'), false);
});

test('validates snapshots and drops signed URLs', () => {
  const media = { id: '8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c', sha256: 'a'.repeat(64), width: 10, height: 10, url: 'https://s3/x?X-Amz-Signature=secret' };
  const snapshot = validateSnapshot({ schemaVersion: 1, articles: [], media: [media] });
  assert.equal(JSON.stringify(withoutMediaUrls(snapshot)).includes('Signature'), false);
  assert.throws(() => validateSnapshot({ schemaVersion: 2, articles: [], media: [] }));
  assert.throws(() => validateSnapshot({ schemaVersion: 1, articles: [], media: [{ ...media, id: '../etc/passwd' }] }));
});

test('maps job statuses to deployment results', () => {
  assert.deepEqual(reportBody('success'), { status: 'succeeded' });
  assert.deepEqual(reportBody('failure', '  build broke  '), { status: 'failed', message: 'build broke' });
  assert.deepEqual(reportBody('cancelled'), { status: 'cancelled' });
  assert.throws(() => reportBody('skipped'));
});
