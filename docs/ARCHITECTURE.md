# Architecture

Notes on how the site is built and why. The guiding rule: a personal site
should be small, fast and easy to change, so every piece here is the simplest
one that meets a concrete requirement.

## Rendering: static HTML per route

**Requirement:** shareable URLs with correct titles, descriptions and previews
for search engines and social networks, which do not run JavaScript; hosting
stays a static S3 bucket behind CloudFront.

**Decision:** React Router 8 in framework mode with `ssr: false` and
`prerender`. At build time each route runs its `loader` and is rendered to
`<path>/index.html`, plus a `.data` file used for client-side navigation. The
browser hydrates and navigates as a SPA from there.

**Alternatives considered:** a hand-written prerender script (more code to
maintain for lazy routes and hydration), Astro or Next.js static export (a
rewrite for a site this size), and client-side meta tags (invisible to
crawlers).

**Consequences:**

- Every child of `:lang` must be listed in `src/routing/prerender.ts`; there
  is no splat route, because its loader could not run at build time.
- With `ssr: false`, React Router reloads a route only when *its own* params
  change. Localized pages re-export `shouldRevalidate` from
  `src/i18n/route.ts` so switching language reloads translated data.
- Clean URLs need a CloudFront Function; see `infra/README.md`.

## Routes and languages

```text
/                      picks a language (saved choice → browser → pt) and redirects
/{pt,en,es}            home
/{lang}/games[/:slug]  catalog and one page per game
/{lang}/labs           projects and experiments
/{lang}/about          about
/{lang}/resume         interactive résumé + PDFs
/{lang}/blog[/:slug]   articles and build logs (slugs per language)
/{lang}/blog/rss.xml   RSS 2.0 feed per language
/404.html              static, trilingual, no JavaScript (served by CloudFront)
/play/:slug/           each game's own build, loaded in an iframe
```

Path segments are English in every language, so a URL stays recognizable and
switching language only swaps the prefix. The URL is the source of truth for
the language; `localStorage` only remembers an explicit choice for `/`.

Dictionaries are plain typed objects (`src/i18n/messages/`), `pt` being the
reference: TypeScript rejects a translation with missing keys. Components read
`useI18n().messages`, so keys autocomplete and typos fail the build. Each page
receives only its own language's dictionary, through the locale layout's
loader. Dates are formatted with `Intl` inside loaders, at build time, so the
browser never re-formats them differently during hydration.

## Content and data access

```text
content/  →  data/local/*  →  data/repositories.ts (interfaces)  →  route loaders  →  components (props)
```

- `content/` holds typed data with `Localized<T>` fields.
- Repositories (`GamesRepository`, `ProjectsRepository`, `ProfileRepository`,
  `ResumeRepository`) are async and return domain objects already resolved for
  one language. `data/index.ts` is the only place that chooses implementations.
- Only loaders talk to repositories; no component imports `content/`.

Moving to an API means writing HTTP implementations of the same interfaces.
Because pages are pre-rendered, an API would be called at build time; content
edited later would need a rebuild (a deploy hook) or, for pages that must be
live, a `clientLoader` on those routes.


## Blog and publishing

**Requirement:** articles written in Portfolio Studio (the CMS in
`andrepatrinicola-api`) must be pre-rendered like every other page, with the
same SEO, and nothing unpublished may reach the site.

**Decision:** the content arrives at build time as a *snapshot*, never at
visit time:

1. The deploy workflow's first step (`scripts/studio/fetch-content.mjs`)
   proves with the run's GitHub OIDC token which run is calling, and the API
   freezes what should be live at that moment: only published revisions and
   only languages marked ready. A push creates its own deployment; the CMS
   dispatches the workflow with `deployment_id`.
2. `process-media.mjs` re-encodes each image (WebP in 480/960/1200/1600 px,
   EXIF rotation applied, metadata stripped) into `public/media/`; the
   originals stay in the API's private bucket.
3. Loaders read the snapshot through the `blog` repository
   (`data/snapshot/`); `routing/prerender.ts` adds one page per published
   language, a redirect page per earlier slug and the feeds.
4. `report-deployment.mjs` tells the API how the job ended; only then does
   the CMS show the article as published.

Bodies are structured documents (Tiptap JSON), rendered by
`features/blog/ArticleContent.tsx` with React elements only; code is
highlighted in loaders (lowlight never ships to the browser). Pages advertise
hreflang alternates only for the languages an article exists in, and the
language switcher follows the translated slug or falls back to that
language's blog index. Unpublishing removes the article from the next
snapshot, so `s3 sync --delete` removes its page, feed entry and images.

Local builds without a snapshot have an empty blog; tests use
`CONTENT_SNAPSHOT=apps/site/e2e/fixtures/blog-snapshot.json` after
`node scripts/studio/process-media.mjs --snapshot apps/site/e2e/fixtures/blog-snapshot.json --originals apps/site/e2e/fixtures/media`.

## Portfolio Studio (`/admin`)

**Requirement:** a private editor for the blog that never puts private
content in static files, never trusts the browser for authorization and
keeps the public site static.

**Decision:** a client-only area inside the same app:

- Routes under `/admin` have no loaders and are not pre-rendered. The build's
  SPA fallback (root layout, no content) becomes `/admin/index.html`
  (`scripts/assemble-deploy.mjs`, with `noindex`), and the CloudFront Function
  serves it for every `/admin` URL. `robots.txt` disallows `/admin`; the sitemap
  never lists it; Umami does not load there.
- Sign-in: Cognito managed login with the authorization code flow and PKCE
  through `oidc-client-ts` (`src/auth/`); tokens live in `sessionStorage`
  only, are renewed with the refresh token and revoked on sign-out. Every
  request carries the access token and the API checks the admin group: the
  admin UI only decides what to *show*.
- The editor is Tiptap 3 (`features/admin/editor/`), limited to the nodes and
  marks the API accepts; images point at the media library by id. Drafts
  autosave 1.5 s after typing stops, with optimistic locking: a stale version
  opens a "keep mine / take theirs" choice instead of overwriting. Unsaved
  edits are copied to `sessionStorage` when a save fails, the session expires
  or the tab closes, and offered back on the next visit.
- Preview uses the public renderer (`features/blog/ArticleContent.tsx`), so
  what is previewed is what is published.
- Publishing returns a deployment id; the panel follows it until the deploy
  reports, and only then shows the article as live.

The admin UI is in Portuguese only (single user); the public site keeps its
three languages. Build variables: `VITE_STUDIO_API_URL`,
`VITE_COGNITO_AUTHORITY`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`
(without them `/admin` explains it is not configured). End-to-end tests run
the real build against stand-ins for Cognito and the API (`e2e/support/studio.ts`).

## Styling and themes

- `styles/tokens.css`: semantic colors written with `light-dark()`, type
  scale, an 8 px spacing grid, motion tokens.
  All text color pairs meet WCAG AA in both themes.
- The theme follows the OS (`color-scheme: light dark`). A manual choice sets
  `data-theme` on `<html>` through an inline script in `<head>`, before the
  first paint, so there is no flash. Another theme is one more
  `[data-theme]` block overriding the semantic tokens.
- CSS lives next to the component that uses it; React Router loads it per
  route. No CSS framework.
- Fonts: VCR OSD Mono (display only, WOFF2, preloaded) and Atkinson Hyperlegible
  Next for reading text.

## The home playfield

The hero's text and links are ordinary HTML. A canvas on top reads their
boxes (line by line for the title) and treats them as solid blocks for a
Pong-like ball; an AI paddle plays on its own until the visitor takes over with
the mouse, a finger or the keyboard.

- `features/home/playfield/engine.ts`: pure simulation (unit-tested).
- `features/home/playfield/playfield.ts`: DOM measuring, input, drawing, loop.
- Loaded with a dynamic import when the browser is idle (≈2.5 KB gzip),
  paused off-screen and in hidden tabs, and never animated on its own under
  `prefers-reduced-motion`.

## Games

Games stay independent Vite apps under `games/`, built to `/play/<slug>/` and
embedded with an iframe that is created only when the visitor presses Play
(no download and no keyboard capture before that). In development, a small
Vite plugin (`apps/site/vite/serve-game-builds.ts`) serves the games' builds at
the same URLs, so the site needs no per-game ports.

## Analytics

Umami Cloud, loaded only after the visitor accepts the banner
(`analytics/consent.ts`; an inline script in `<head>` loads it on later
visits). It reports only on the production domains listed in
`analytics/umami.ts`, where the event names live. Events are sent with
`track()` from click handlers; page views come from the tracker. Declining
also sets `umami.disabled`, which stops a tracker already loaded on the page.

## Quality

- Unit tests (Vitest + Testing Library) for content integrity, repositories,
  i18n helpers, metadata and shared components.
- End-to-end tests (Playwright) against the production build served with the
  CloudFront rules: routing, direct access, 404s, languages, theme, games,
  home, résumé, mobile overflow, and axe accessibility checks in both themes.
- Lighthouse (mobile, simulated throttling, 2026-10-19): performance 95,
  accessibility 100, best practices 100, SEO 100.
