import { createLocalGamesRepository } from "./local/games";
import { createLocalProfileRepository } from "./local/profile";
import type { Repositories } from "./repositories";

/** The single place that decides where content comes from. */
export const repositories: Repositories = {
  games: createLocalGamesRepository(),
  profile: createLocalProfileRepository(),
};
