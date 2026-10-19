// Serves the assembled `.deploy/` folder with the same URL rules as the
// production CloudFront distribution (see infra/cloudfront/):
//   - extensionless paths resolve to `<path>/index.html`
//   - missing files answer `/404.html` with status 404
// Usage: node scripts/serve-deploy.mjs [port]
import { createServer } from 'node:http';
import { join, normalize, resolve } from 'node:path';

import { isFile, resolveIndex, sendFile } from './static-files.mjs';

const root = resolve(process.cwd(), '.deploy');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const filePath = normalize(join(root, resolveIndex(decodeURIComponent(pathname))));

  if (filePath.startsWith(root) && (await isFile(filePath))) {
    sendFile(res, filePath);
    return;
  }

  const notFound = join(root, '404.html');
  if (await isFile(notFound)) {
    sendFile(res, notFound, 404);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving .deploy on http://localhost:${port}`);
});
