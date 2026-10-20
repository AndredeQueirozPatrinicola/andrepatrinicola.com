import type { Game } from "../domain/game";
import type { Profile } from "../domain/profile";
import type { Project } from "../domain/project";
import type { Resume } from "../domain/resume";
import type { Locale } from "../i18n/config";

/**
 * Read access to the portfolio content. Route loaders depend on these
 * interfaces, never on where the data comes from, so the local content files
 * can later be replaced by HTTP implementations backed by an API.
 */
export interface GamesRepository {
  list(locale: Locale): Promise<Game[]>;
  findBySlug(slug: string, locale: Locale): Promise<Game | undefined>;
}

export interface ProfileRepository {
  get(locale: Locale): Promise<Profile>;
}

export interface ProjectsRepository {
  list(locale: Locale): Promise<Project[]>;
}

export interface ResumeRepository {
  get(locale: Locale): Promise<Resume>;
}

export type Repositories = {
  games: GamesRepository;
  profile: ProfileRepository;
  projects: ProjectsRepository;
  resume: ResumeRepository;
};
