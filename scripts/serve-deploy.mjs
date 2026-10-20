// Serves the assembled `.deploy/` folder with the same rules as production:
// URLs go through the CloudFront Function in infra/cloudfront/url-rewrite.js,
// "/" maps to the default root object (index.html) and missing files answer
// /404.html with status 404 (the distribution's custom error response).
// Usage: node scripts/serve-deploy.mjs [port]
import { createServer } from 'node:http';
import { join, normalize, resolve } from 'node:path';

import { loadUrlRewrite } from '../infra/cloudfront/load-function.mjs';
import { isFile, sendFile } from './static-files.mjs';

const root = resolve(process.cwd(), '.deploy');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const urlRewrite = loadUrlRewrite();

function toQuerystring(searchParams) {
  const querystring = {};
  for (const [key, value] of searchParams) {
    const entry = { value };
    if (!querystring[key]) querystring[key] = entry;
    else querystring[key] = { value: querystring[key].value, multiValue: [...(querystring[key].multiValue ?? [querystring[key]]), entry] };
  }
  return querystring;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const result = urlRewrite({ request: { uri: url.pathname, querystring: toQuerystring(url.searchParams) } });

  if (result.statusCode) {
    res.writeHead(result.statusCode, { Location: result.headers.location.value }).end();
    return;
  }

  // The distribution's default root object answers "/".
  const uri = result.uri === '/' ? '/index.html' : result.uri;
  const filePath = normalize(join(root, decodeURIComponent(uri)));
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
