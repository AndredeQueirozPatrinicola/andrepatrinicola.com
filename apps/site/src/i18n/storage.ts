import type { Locale } from "./config";
import { LOCALE_STORAGE_KEY } from "./paths";

/** Remembers an explicit language choice for the next visit to `/`. */
export function rememberLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
}
