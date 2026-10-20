import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { findPublishedGames } from './games.mjs';

const root = process.cwd();
const outputDirectory = resolve(root, '.deploy');

async function assemble() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  await cp(resolve(root, 'apps/site/build/client'), outputDirectory, { recursive: true });

  // CloudFront serves /404.html for missing paths (see infra/cloudfront/).
  await rename(resolve(outputDirectory, '404/index.html'), resolve(outputDirectory, '404.html'));
  await rm(resolve(outputDirectory, '404'), { recursive: true, force: true });
  // Not used: there is no SPA fallback, and resource routes need no client data.
  for (const unused of ['__spa-fallback.html', '404.data', 'sitemap.xml.data', 'robots.txt.data']) {
    await rm(resolve(outputDirectory, unused), { force: true });
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
