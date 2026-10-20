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

**Future admin area:** authentication and editing would live under a separate
`/admin` segment with its own layout and `clientLoader`s, excluded from
prerendering and from the sitemap. Nothing of it exists yet by design.

## Styling and themes

- `styles/tokens.css`: semantic colors written with `light-dark()`, type
  scale, an 8 px spacing grid (also drawn in the background), motion tokens.
  All text color pairs meet WCAG AA in both themes.
- The theme follows the OS (`color-scheme: light dark`). A manual choice sets
  `data-theme` on `<html>` through an inline script in `<head>`, before the
  first paint, so there is no flash. Another theme is one more
  `[data-theme]` block overriding the semantic tokens.
- CSS lives next to the component that uses it; React Router loads it per
  route. No CSS framework.
- Fonts: VCR OSD Mono (display only, WOFF2, preloaded) and IBM Plex Sans for
  reading text.

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

## Quality

- Unit tests (Vitest + Testing Library) for content integrity, repositories,
  i18n helpers, metadata and shared components.
- End-to-end tests (Playwright) against the production build served with the
  CloudFront rules: routing, direct access, 404s, languages, theme, games,
  home, résumé, mobile overflow, and axe accessibility checks in both themes.
- Lighthouse (mobile, simulated throttling, 2026-10-20): performance 95,
  accessibility 100, best practices 100, SEO 100.
