import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { findPublishedGames } from './games.mjs';

const root = process.cwd();
const outputDirectory = resolve(root, '.deploy');
// The assistant's documents (apps/site/src/routes/ai-knowledge.ts): kept next
// to the package for the deploy workflow, never inside it.
const knowledgeDirectory = resolve(root, '.knowledge');

async function assemble() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  await cp(resolve(root, 'apps/site/build/client'), outputDirectory, { recursive: true });

  // CloudFront serves /404.html for missing paths (see infra/cloudfront/).
  await rename(resolve(outputDirectory, '404/index.html'), resolve(outputDirectory, '404.html'));
  await rm(resolve(outputDirectory, '404'), { recursive: true, force: true });
  // Portfolio Studio (/admin) is client-only: React Router's SPA fallback
  // (root layout, no page content) is its shell, served by the CloudFront
  // Function for every /admin URL. It must never be indexed.
  const shell = await readFile(resolve(outputDirectory, '__spa-fallback.html'), 'utf8');
  if (!shell.includes('<head>')) throw new Error('Unexpected SPA fallback: no <head>');
  await mkdir(resolve(outputDirectory, 'admin'), { recursive: true });
  await writeFile(
    resolve(outputDirectory, 'admin/index.html'),
    shell.replace('<head>', '<head><meta name="robots" content="noindex, nofollow"/>'),
  );

  await rm(knowledgeDirectory, { recursive: true, force: true });
  await mkdir(knowledgeDirectory, { recursive: true });
  await rename(resolve(outputDirectory, 'ai-knowledge.json'), resolve(knowledgeDirectory, 'site-knowledge.json'));

  // Not used: resource routes need no client data.
  for (const unused of ['__spa-fallback.html', '404.data', 'sitemap.xml.data', 'robots.txt.data', 'ai-knowledge.json.data']) {
    await rm(resolve(outputDirectory, unused), { force: true });
  }
  for (const locale of await readdir(outputDirectory, { withFileTypes: true })) {
    if (locale.isDirectory()) await rm(resolve(outputDirectory, locale.name, 'blog/rss.xml.data'), { force: true });
  }

  const games = await findPublishedGames(root);

  for (const game of games) {
    await cp(game.dist, resolve(outputDirectory, 'play', game.slug), { recursive: true });
  }

  console.log(`Deployment assembled with ${games.length} game(s).`);
}

assemble().catch((error) => {
  console.error(error);
  process.exit(1);
});
