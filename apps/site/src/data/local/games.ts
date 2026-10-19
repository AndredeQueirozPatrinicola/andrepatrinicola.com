import { games, type GameEntry } from "../../content/games";
import type { Game } from "../../domain/game";
import { localize } from "../../domain/localized";
import type { Locale } from "../../i18n/config";
import type { GamesRepository } from "../repositories";

function toGame(entry: GameEntry, locale: Locale): Game {
  return {
    ...entry,
    tagline: localize(entry.tagline, locale),
    goal: localize(entry.goal, locale),
    rules: localize(entry.rules, locale),
    controls: entry.controls.map((control) => ({
      keys: control.keys,
      action: localize(control.action, locale),
    })),
    internals: localize(entry.internals, locale),
    notes: localize(entry.notes, locale),
  };
}

export function createLocalGamesRepository(entries: GameEntry[] = games): GamesRepository {
  return {
    async list(locale) {
      return entries.map((entry) => toGame(entry, locale));
    },
    async findBySlug(slug, locale) {
      const entry = entries.find((candidate) => candidate.slug === slug);
      return entry && toGame(entry, locale);
    },
  };
}
