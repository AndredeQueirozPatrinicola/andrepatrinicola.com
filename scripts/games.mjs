import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Lists the games marked as published in `games/<dir>/package.json`
 * (`"andre": { "type": "game", "slug": "...", "published": true }`).
 */
export async function findPublishedGames(repositoryRoot) {
  const gamesDirectory = resolve(repositoryRoot, 'games');
  const entries = await readdir(gamesDirectory, { withFileTypes: true });
  const games = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const directory = resolve(gamesDirectory, entry.name);
    const packageJson = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
    const metadata = packageJson.andre;

    if (metadata?.type !== 'game' || metadata?.published !== true) continue;

    if (!metadata.slug) {
      throw new Error(`O jogo "${entry.name}" está publicado, mas não possui andre.slug.`);
    }

    games.push({ slug: metadata.slug, directory, dist: resolve(directory, 'dist') });
  }

  return games;
}
