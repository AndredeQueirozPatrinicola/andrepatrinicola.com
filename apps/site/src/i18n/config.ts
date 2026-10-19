export const locales = ["pt", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

type LocaleInfo = {
  /** BCP 47 tag used in `lang`, `hreflang` and `Intl`. */
  tag: string;
  /** Open Graph locale. */
  ogLocale: string;
  /** Name of the language in the language itself. */
  nativeName: string;
};

export const localeInfo: Record<Locale, LocaleInfo> = {
  pt: { tag: "pt-BR", ogLocale: "pt_BR", nativeName: "Português" },
  en: { tag: "en", ogLocale: "en_US", nativeName: "English" },
  es: { tag: "es", ogLocale: "es_ES", nativeName: "Español" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
