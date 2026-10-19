// Serves the assembled `.deploy/` folder with the same URL rules as the
// production CloudFront distribution (see infra/cloudfront/):
//   - extensionless paths resolve to `<path>/index.html`
//   - missing files answer `/404.html` with status 404
// Usage: node scripts/serve-deploy.mjs [port]
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), '.deploy');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.data': 'text/x-script; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

function rewriteUri(uri) {
  if (uri.endsWith('/')) return `${uri}index.html`;
  if (!extname(uri)) return `${uri}/index.html`;
  return uri;
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function send(res, status, path) {
  res.writeHead(status, {
    'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(res);
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const uri = rewriteUri(decodeURIComponent(pathname));
  const filePath = normalize(join(root, uri));

  if (filePath.startsWith(root) && (await isFile(filePath))) {
    send(res, 200, filePath);
    return;
  }

  const notFound = join(root, '404.html');
  if (await isFile(notFound)) {
    send(res, 404, notFound);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving .deploy on http://localhost:${port}`);
});
