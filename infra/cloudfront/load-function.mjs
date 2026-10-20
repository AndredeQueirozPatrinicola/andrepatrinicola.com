import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/**
 * Loads url-rewrite.js the way CloudFront does (a plain script defining
 * `handler`), so local tools and tests run the exact production code.
 */
export function loadUrlRewrite() {
  const source = readFileSync(new URL('./url-rewrite.js', import.meta.url), 'utf8');
  const context = {};
  runInNewContext(`${source}\nthis.handler = handler;`, context);
  return context.handler;
}
