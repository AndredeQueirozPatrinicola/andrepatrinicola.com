import { defaultLocale, isLocale, locales, type Locale } from "./config";
import { pickLocale } from "./detect";

/** localStorage key for an explicit language choice made in the switcher. */
export const LOCALE_STORAGE_KEY = "locale";

/** Builds an internal URL: `localePath("en", "/games")` → `/en/games`. */
export function localePath(locale: Locale, path = ""): string {
  const suffix = path === "/" ? "" : path;
  return `/${locale}${suffix}`;
}

/** Same page in another language: `/pt/games/pong` → `/en/games/pong`. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const [, first, ...rest] = pathname.split("/");
  const tail = isLocale(first) ? rest : [first, ...rest].filter(Boolean);
  return localePath(target, tail.length ? `/${tail.join("/")}` : "");
}

/** The visitor's language: stored choice, then browser languages, then the default. */
export function detectLocale(preferred: readonly string[], stored?: string | null): Locale {
  const locale = pickLocale(locales, defaultLocale, preferred, stored);
  return isLocale(locale) ? locale : defaultLocale;
}
