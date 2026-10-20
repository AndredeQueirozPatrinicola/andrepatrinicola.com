import { createLocalGamesRepository } from "./local/games";
import { createLocalProfileRepository } from "./local/profile";
import { createLocalProjectsRepository } from "./local/projects";
import { createLocalResumeRepository } from "./local/resume";
import type { Repositories } from "./repositories";

/** The single place that decides where content comes from. */
export const repositories: Repositories = {
  games: createLocalGamesRepository(),
  profile: createLocalProfileRepository(),
  projects: createLocalProjectsRepository(),
  resume: createLocalResumeRepository(),
};
