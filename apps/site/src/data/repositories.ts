import type { BlogPost, BlogPostSummary } from "../domain/blog";
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

/** One published language of an article, for the sitemap and the pre-render list. */
export type BlogEntry = {
  id: string;
  locale: Locale;
  slug: string;
  previousSlugs: string[];
  updatedAt: string;
  /** Slug of the article in each published language, this one included. */
  translations: Partial<Record<Locale, string>>;
};

export interface BlogRepository {
  /** Newest first. */
  list(locale: Locale): Promise<BlogPostSummary[]>;
  findBySlug(slug: string, locale: Locale): Promise<BlogPost | undefined>;
  /** Current slug of an article that was published under `slug` before. */
  findMovedSlug(slug: string, locale: Locale): Promise<string | undefined>;
  entries(): Promise<BlogEntry[]>;
}

export type Repositories = {
  blog: BlogRepository;
  games: GamesRepository;
  profile: ProfileRepository;
  projects: ProjectsRepository;
  resume: ResumeRepository;
};
