// Shared helpers of the Portfolio Studio deploy scripts. Node built-ins only:
// fetch-content runs before `npm ci`.
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

/** Same widths as apps/site/src/domain/blog.ts (a test keeps them in sync). */
export const imageWidths = [480, 960, 1200, 1600];

export function widthsFor(originalWidth) {
  const widths = imageWidths.filter((width) => width <= originalWidth);
  return widths.length ? widths : [originalWidth];
}

/** Same as shareImageWidth / shareImagePath / shareImageIds in apps/site/src/domain/blog.ts. */
export const shareImageWidth = 1200;
export const shareImageName = (id) => `${id}-share.jpg`;

export function shareImageIds(articles) {
  const ids = new Set();
  for (const article of articles) {
    if (article.coverMediaId) ids.add(article.coverMediaId);
    for (const locale of article.locales ?? []) if (locale.ogMediaId) ids.add(locale.ogMediaId);
  }
  return ids;
}

export const DEFAULT_SNAPSHOT = 'apps/site/content/blog-snapshot.json';
export const DEFAULT_MEDIA_DIR = '.studio-media';
export const DEFAULT_AUDIENCE = 'andrepatrinicola-api';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** HTTPS, or plain HTTP to this machine (tests and the API's local server). */
export function isSecureUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  return url.protocol === 'https:' || (local && url.protocol === 'http:');
}

/** Base URL of the API, without a trailing slash. HTTPS only (or localhost for tests). */
export function apiBase(value) {
  if (!value) throw new Error('STUDIO_API_URL is not set');
  if (!isSecureUrl(value)) throw new Error('STUDIO_API_URL must use https');
  return new URL(value).toString().replace(/\/+$/, '');
}

/** The checks the build relies on before anything is written. */
export function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1) throw new Error('Unsupported snapshot schemaVersion');
  if (!Array.isArray(snapshot.articles) || !Array.isArray(snapshot.media)) throw new Error('Snapshot without articles or media');
  for (const media of snapshot.media) {
    if (!isUuid(media.id)) throw new Error('Snapshot media with an invalid id');
    if (!/^[0-9a-f]{64}$/.test(media.sha256 ?? '')) throw new Error(`Media ${media.id} without a valid sha256`);
    if (!Number.isInteger(media.width) || media.width < 1) throw new Error(`Media ${media.id} without a width`);
  }
  return snapshot;
}

/** The temporary (signed) download URLs never reach the build output. */
export function withoutMediaUrls(snapshot) {
  return { ...snapshot, media: snapshot.media.map(({ url: _url, ...media }) => media) };
}

export function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch with a timeout, retrying network errors and 502/503/504 a few
 * times (with backoff). Other statuses are returned to the caller.
 */
export async function request(url, init = {}, { attempts = 3, timeoutMs = 20_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (![502, 503, 504].includes(response.status) || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000 * 2 ** (attempt - 1));
  }
  throw new Error(`Request failed after ${attempts} attempts (${lastError?.name ?? 'error'})`);
}

/** GitHub Actions OIDC token for the API (requires `permissions: id-token: write`). */
export async function oidcToken(audience = process.env.STUDIO_API_AUDIENCE || DEFAULT_AUDIENCE) {
  const endpoint = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const bearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!endpoint || !bearer) throw new Error('No GitHub OIDC token available (id-token: write permission missing?)');
  const url = new URL(endpoint);
  url.searchParams.set('audience', audience);
  const response = await request(url, { headers: { authorization: `bearer ${bearer}` } });
  if (!response.ok) throw new Error(`Could not get an OIDC token (HTTP ${response.status})`);
  const body = await response.json();
  if (typeof body.value !== 'string') throw new Error('Unexpected OIDC token response');
  return body.value;
}

/** Reads an error body for logs: JSON error code and message only, never headers. */
export async function describeError(response) {
  try {
    const body = await response.json();
    return `HTTP ${response.status} ${body.error ?? ''}${body.message ? `: ${body.message}` : ''}`.trim();
  } catch {
    return `HTTP ${response.status}`;
  }
}
