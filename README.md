# andrepatrinicola.com

Personal site and portfolio of André de Queiroz Patrinicola: browser games
written from scratch on a small engine of my own, labs, an interactive résumé,
in Portuguese, English and Spanish.

Every page is pre-rendered to static HTML (React Router in framework mode with
`ssr: false`) and served from S3 through CloudFront. There is no runtime server.

## Structure

```text
apps/site/          The site (React Router 8, React 19, TypeScript, Vite 8)
  src/content/      Typed content: games, projects, résumé, profile
  src/data/         Repository interfaces + local implementations
  src/routes/       One module per page: loader, meta and component
  src/features/     Page-specific components (home playfield, games, résumé…)
  src/i18n/         Locales, typed dictionaries, URL helpers
  src/seo/          Metadata, structured data, site origin
  src/styles/       Design tokens, themes, base styles
  e2e/              Playwright end-to-end and accessibility tests
games/              Canvas games, each a standalone Vite + TypeScript app
infra/              CloudFront Function and distribution setup guide
scripts/            Deploy assembly and the local production preview server
docs/               Architecture notes
```

## Requirements

- Node.js 22.22 or later and npm
- For end-to-end tests: `npx playwright install chromium` once

## Commands

```bash
npm install
npm run dev        # builds the games, then starts the site at localhost:5173
npm run build      # site + games, assembled into .deploy/
npm run preview    # serves .deploy/ with the production URL rules (localhost:4173)
npm run lint       # TypeScript + ESLint
npm test           # unit tests (Vitest) and CloudFront Function tests
npm run test:e2e   # Playwright against the built site (run `npm run build` first)
```

Work on a single game with its own dev server, e.g. `npm run dev:pong`.

## Common changes

- **Add a game:** create it under `games/<name>` with
  `"andre": { "type": "game", "slug": "<slug>", "published": true }` in its
  `package.json` and a `build` script, add it to `build:games`, then describe it
  in `apps/site/src/content/games.ts` (cover in `public/images/games/`). Its
  page, sitemap entry and prerendering follow from the content file; for a
  custom link preview, add it to the share-image script and set `ogImage`.
- **Add a lab project:** an entry in `apps/site/src/content/projects.ts`.
- **Update the résumé:** `apps/site/src/content/resume.ts` and the PDFs in
  `apps/site/public/resume/`.
- **Add a language:** a dictionary in `src/i18n/messages/` (TypeScript lists
  the missing keys), an entry in `src/i18n/config.ts`, and the new locale in
  each `Localized` content value.
- **Add a theme:** a `:root[data-theme="<name>"]` block overriding the semantic
  tokens in `src/styles/tokens.css`, and the name in `src/theme/theme.ts`.
- **Regenerate share images and favicons:**
  `python3 apps/site/scripts/generate-share-images.py` (needs Pillow).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, tests, build, upload
to S3 with cache headers per file type, and a CloudFront invalidation. The
distribution needs a URL-rewrite function and custom error responses for clean
URLs and real 404s; see [infra/README.md](infra/README.md).

Set the repository variable `SITE_URL` when a custom domain is added.

More on the design decisions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
