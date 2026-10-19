import { join, normalize, resolve } from "node:path";
import type { Plugin } from "vite";

import { findPublishedGames } from "../../../scripts/games.mjs";
import { isFile, resolveIndex, sendFile } from "../../../scripts/static-files.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

/**
 * In development, serves each game's production build under `/play/<slug>/`,
 * the same URL used in production, so the site never needs per-game dev
 * server ports. Run `npm run build:games` first; develop a game itself with
 * its own `npm run dev`.
 */
export function serveGameBuilds(): Plugin {
  return {
    name: "serve-game-builds",
    apply: "serve",
    async configureServer(server) {
      const games = await findPublishedGames(repositoryRoot);

      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        const match = /^\/play\/([^/]+)(\/.*)?$/.exec(pathname);
        const game = match && games.find((candidate) => candidate.slug === match[1]);

        if (!game) return next();

        const filePath = normalize(join(game.dist, resolveIndex(match[2] ?? "/")));
        if (filePath.startsWith(game.dist) && (await isFile(filePath))) {
          sendFile(res, filePath);
          return;
        }

        res.statusCode = 404;
        res.end(`Build not found for "${game.slug}". Run npm run build:games.`);
      });
    },
  };
}
