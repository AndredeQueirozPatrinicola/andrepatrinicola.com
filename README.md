# andrepatrinicola.com

A portfolio and laboratory for developing, exploring, and publishing browser game prototypes. It includes projects built with the native Canvas API and JavaScript frameworks, as well as ports of games originally developed with other engines, languages, and technologies.

## Structure

```text
apps/site/          Main application
packages/ui/        Shared components
packages/config/    Monorepo configuration
.github/workflows/  CI/CD workflows
```

## Requirements

- Node.js 20 or later
- npm

## Development

Install the dependencies and start the local development server:

```bash
npm install
npm run dev
```

The site uses the Vite development server. Do not open `apps/site/index.html` directly in the browser.

Games are deployed from their own repositories into `/play/<slug>/` on the
same bucket. The React site keeps the catalog entries that point to those
published game URLs.

## Build

```bash
npm run build
```
