import type { Locale } from "../i18n/config";

/** A value written once per supported locale. */
export type Localized<T = string> = Record<Locale, T>;

export function localize<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}
