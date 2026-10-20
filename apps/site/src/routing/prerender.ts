import { locales } from "../i18n/config";
import { localePath } from "../i18n/paths";

/** Every URL rendered to static HTML at build time. */
export function getPrerenderPaths(): string[] {
  const localized = locales.flatMap((locale) => [localePath(locale)]);

  return ["/", "/404", ...localized];
}
