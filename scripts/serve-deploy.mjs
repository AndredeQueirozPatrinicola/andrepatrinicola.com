// Serves the assembled `.deploy/` folder with the same rules as production:
// URLs go through the CloudFront Function in infra/cloudfront/url-rewrite.js,
// "/" maps to the default root object (index.html) and missing files answer
// /404.html with status 404 (the distribution's custom error response).
// Usage: node scripts/serve-deploy.mjs [port]
import { createServer } from 'node:http';
import { join, normalize, resolve, sep } from 'node:path';

import { loadUrlRewrite } from '../infra/cloudfront/load-function.mjs';
import { isFile, sendFile } from './static-files.mjs';

const root = resolve(process.cwd(), '.deploy');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const urlRewrite = loadUrlRewrite();

/** CloudFront's event shape: values are passed on still URL-encoded. */
function toQuerystring(search) {
  const querystring = {};
  for (const pair of search.replace(/^\?/, '').split('&').filter(Boolean)) {
    const [key, value = ''] = pair.split('=');
    const entry = { value };
    const existing = querystring[key];
    querystring[key] = existing
      ? { value: existing.value, multiValue: [...(existing.multiValue ?? [existing]), entry] }
      : entry;
  }
  return querystring;
}

async function sendNotFound(req, res) {
  const notFound = join(root, '404.html');
  if (await isFile(notFound)) {
    sendFile(res, notFound, 404, req.headers['accept-encoding']);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}

async function handle(req, res) {
  // Concatenated, not resolved: "//host/" must stay a path, as on CloudFront.
  const url = new URL(`http://localhost${req.url ?? '/'}`);
  const result = urlRewrite({ request: { uri: url.pathname, querystring: toQuerystring(url.search) } });

  if (result.statusCode) {
    if (result.headers?.location) {
      res.writeHead(result.statusCode, { Location: result.headers.location.value }).end();
    } else {
      await sendNotFound(req, res);
    }
    return;
  }

  // The distribution's default root object answers "/".
  const uri = result.uri === '/' ? '/index.html' : result.uri;
  const filePath = normalize(join(root, decodeURIComponent(uri)));

  if (filePath.startsWith(root + sep) && (await isFile(filePath))) {
    sendFile(res, filePath, 200, req.headers['accept-encoding']);
    return;
  }

  await sendNotFound(req, res);
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    // e.g. a malformed escape such as /%E0
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
  });
});

server.listen(port, () => {
  console.log(`Serving .deploy on http://localhost:${port}`);
});
