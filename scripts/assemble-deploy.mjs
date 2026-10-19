import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { findPublishedGames } from './games.mjs';

const root = process.cwd();
const outputDirectory = resolve(root, '.deploy');

async function assemble() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  await cp(resolve(root, 'apps/site/build/client'), outputDirectory, { recursive: true });

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
