import { createLocalGamesRepository } from "./local/games";
import { createLocalProfileRepository } from "./local/profile";
import { createLocalResumeRepository } from "./local/resume";
import type { Repositories } from "./repositories";

/** The single place that decides where content comes from. */
export const repositories: Repositories = {
  games: createLocalGamesRepository(),
  profile: createLocalProfileRepository(),
  resume: createLocalResumeRepository(),
};
