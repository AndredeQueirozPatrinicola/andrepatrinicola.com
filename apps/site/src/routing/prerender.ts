import { games } from "../content/games";
import { locales } from "../i18n/config";
import { localePath } from "../i18n/paths";

/** Paths below the locale prefix that exist in every language. */
function localizedPaths(): string[] {
  return ["", "/games", ...games.map((game) => `/games/${game.slug}`)];
}

/** Every URL rendered to static HTML at build time. */
export function getPrerenderPaths(): string[] {
  const localized = locales.flatMap((locale) =>
    localizedPaths().map((path) => localePath(locale, path)),
  );

  return ["/", "/404", ...localized];
}
