# Infrastructure

The site is a set of static files in a private S3 bucket served by CloudFront.
The GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and uploads
them on every push to `main`; the distribution itself is configured by hand in
AWS. This folder holds what that configuration needs.

## Why the distribution needs changes

Every page is pre-rendered to `<path>/index.html` (for example
`/pt/games/pong/index.html`). Out of the box, CloudFront with a private S3
origin only resolves the root object, so a direct visit to `/pt/games/pong`
answers `403 AccessDenied` — which is what production returned for `/games`,
`/play/pong/` and `/robots.txt` when this was written (2026-10-19).

Mapping every error to `/index.html` would hide the problem but turn every
missing URL into a "200 home page" for crawlers. Instead:

1. **A CloudFront Function** (`cloudfront/url-rewrite.js`) rewrites clean URLs
   to their `index.html`, redirects `/page/` to `/page` (one canonical URL) and
   keeps the trailing slash on `/play/<game>/`, whose builds use relative paths.
2. **Custom error responses** answer missing files with `/404.html` and a real
   `404` status.

Both are compatible with the current site, so they can be applied before the
new version is deployed — and they must be, otherwise opening or reloading a
page like `/pt/games` directly returns 403.

`scripts/serve-deploy.mjs` (`npm run preview`) runs the same function file
locally, and `cloudfront/url-rewrite.test.mjs` covers its rules (`npm test`).

## Setup

### 1. Create and publish the function

In the console: **CloudFront → Functions → Create function**, runtime
`cloudfront-js-2.0`, paste `cloudfront/url-rewrite.js`, **Save**, test it with
`cloudfront/test-event.json` (the URI should become `/pt/games/pong/index.html`),
then **Publish**.

Or with the AWS CLI:

```bash
aws cloudfront create-function \
  --name portfolio-url-rewrite \
  --function-config Comment="Clean URLs to index.html",Runtime=cloudfront-js-2.0 \
  --function-code fileb://infra/cloudfront/url-rewrite.js

ETAG=$(aws cloudfront describe-function --name portfolio-url-rewrite --query ETag --output text)
aws cloudfront test-function --name portfolio-url-rewrite --if-match "$ETAG" \
  --event-object fileb://infra/cloudfront/test-event.json
aws cloudfront publish-function --name portfolio-url-rewrite --if-match "$ETAG"
```

To update it later, use `aws cloudfront update-function` with the same files,
then publish again.

### 2. Associate it with the distribution

The function leaves `/` to the distribution's **Default root object**, which
must stay `index.html` (it already is: `/` answers 200 today).

**Distribution → Behaviors → Default (\*) → Edit → Function associations →
Viewer request**: *CloudFront Functions*, `portfolio-url-rewrite`. Save.

### 3. Add custom error responses

**Distribution → Error pages → Create custom error response**, twice:

| HTTP error code | Response page path | HTTP response code | Error caching TTL |
| --- | --- | --- | --- |
| 403 | `/404.html` | 404 | 60 |
| 404 | `/404.html` | 404 | 60 |

### 4. Check

After the distribution finishes deploying (and after the new site is
deployed for the last two lines):

```bash
SITE=https://d1eq0mvu3moyxu.cloudfront.net
curl -sI $SITE/pt/games/pong | head -1   # 200
curl -sI $SITE/pt/games/     | head -3   # 301, location: /pt/games
curl -sI $SITE/play/pong     | head -3   # 301, location: /play/pong/
curl -sI $SITE/nope          | head -1   # 404 (trilingual 404 page)
curl -s  $SITE/robots.txt                # robots with the sitemap URL
```

## Caching

The workflow uploads hashed files (`assets/`, `play/*/assets/`) with
`Cache-Control: public, max-age=31536000, immutable` and everything else
(HTML, `.data`, images, PDFs) with `max-age=0, must-revalidate`, then
invalidates `/*`. If the distribution uses a cache policy that ignores origin
headers, switch the default behavior to **CachingOptimized** or a policy that
honors `Cache-Control`.

Keep **Compress objects automatically** on in the default behavior: the site
ships about 100 KB of JavaScript compressed versus roughly 300 KB raw. The
local preview server gzips the same file types so Lighthouse numbers measured
locally are comparable (mobile, simulated throttling, 2026-10-20: performance
95, accessibility 100, best practices 100, SEO 100; LCP ≈ 2.4 s, CLS 0).

## A custom domain later

1. Request a certificate in **ACM, region us-east-1**, for the domain.
2. Add the domain as an **alternate domain name** on the distribution and
   attach the certificate.
3. Point DNS at the distribution (a Route 53 alias, or a CNAME elsewhere).
4. Set the repository variable **`SITE_URL`** (GitHub → Settings → Variables)
   to `https://your-domain`, and deploy. Canonical URLs, Open Graph and the
   sitemap switch to the new origin; the CloudFront address keeps working.
