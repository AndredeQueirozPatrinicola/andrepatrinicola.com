import { createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.data': 'text/x-script; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

export async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const compressible = new Set(['.html', '.js', '.css', '.json', '.data', '.xml', '.txt', '.svg', '.webmanifest']);

/**
 * Sends a file, gzipped when the client accepts it and the type benefits,
 * like CloudFront's automatic compression.
 */
export function sendFile(res, path, status = 200, acceptEncoding = '') {
  const extension = extname(path);
  const headers = { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream' };
  const gzip = compressible.has(extension) && /\bgzip\b/.test(acceptEncoding);

  if (gzip) {
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    createReadStream(path).pipe(createGzip()).pipe(res);
    return;
  }

  res.writeHead(status, headers);
  createReadStream(path).pipe(res);
}

/** Maps a directory URL to its index.html (used for the game builds in dev). */
export function resolveIndex(uri) {
  if (uri.endsWith('/')) return `${uri}index.html`;
  if (!extname(uri)) return `${uri}/index.html`;
  return uri;
}
