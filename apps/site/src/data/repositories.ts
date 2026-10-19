import type { Game } from "../domain/game";
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

export type Repositories = {
  games: GamesRepository;
};
