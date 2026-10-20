import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadUrlRewrite } from './load-function.mjs';

const handler = loadUrlRewrite();
const run = (uri, querystring = {}) => handler({ request: { uri, querystring } });

test('rewrites clean URLs to their index.html', () => {
  assert.equal(run('/pt').uri, '/pt/index.html');
  assert.equal(run('/en/games/pong').uri, '/en/games/pong/index.html');
});

test('leaves the root and files alone', () => {
  assert.equal(run('/').uri, '/');
  assert.equal(run('/assets/root-abc.js').uri, '/assets/root-abc.js');
  assert.equal(run('/pt/games/pong.data').uri, '/pt/games/pong.data');
  assert.equal(run('/play/pong/index.html').uri, '/play/pong/index.html');
});

test('removes trailing slashes from pages, keeping the query', () => {
  const response = run('/es/resume/', { ref: { value: 'cv' }, x: { value: '' } });
  assert.equal(response.statusCode, 301);
  assert.equal(response.headers.location.value, '/es/resume?ref=cv&x');
});

test('keeps the trailing slash games need for relative assets', () => {
  assert.equal(run('/play/pong/').uri, '/play/pong/index.html');
  assert.equal(run('/play/pong').headers.location.value, '/play/pong/');
});
