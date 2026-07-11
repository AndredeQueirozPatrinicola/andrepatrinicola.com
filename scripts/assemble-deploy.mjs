    import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
    import { resolve } from 'node:path';

    const root = process.cwd();
    const gamesDirectory = resolve(root, 'games');
    const outputDirectory = resolve(root, '.deploy');

    async function copyDirectory(source, destination) {
    await mkdir(destination, { recursive: true });
    await cp(source, destination, {
      recursive: true,
      force: true,
    });
    }

    async function getGames() {
    const entries = await readdir(gamesDirectory, {
      withFileTypes: true,
    });

    const games = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const gameDirectory = resolve(gamesDirectory, entry.name);
      const packagePath = resolve(gameDirectory, 'package.json');

      const packageContent = await readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      const metadata = packageJson.andre;

      if (metadata?.type !== 'game' || metadata?.published !== true) {
        continue;
      }

      if (!metadata.slug) {
        throw new Error(
          `O jogo "${entry.name}" está publicado, mas não possui andre.slug.`,
        );
      }

      games.push({
        slug: metadata.slug,
        source: resolve(gameDirectory, 'dist'),
      });
    }

    return games;
    }

    async function assemble() {
    await rm(outputDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(outputDirectory, {
      recursive: true,
    });

    await copyDirectory(
      resolve(root, 'apps/site/dist'),
      outputDirectory,
    );

    const games = await getGames();

    for (const game of games) {
      await copyDirectory(
        game.source,
        resolve(outputDirectory, 'play', game.slug),
      );
    }

    console.log(`Deployment assembled with ${games.length} game(s).`);
}

assemble().catch((error) => {
    console.error(error);
    process.exit(1);
});