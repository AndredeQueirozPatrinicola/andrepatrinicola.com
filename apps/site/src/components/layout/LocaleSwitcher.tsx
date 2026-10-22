import { Link, useLocation, useMatches } from "react-router";

import { track } from "../../analytics/umami";
import { localeInfo, locales, type Locale } from "../../i18n/config";
import { useI18n } from "../../i18n/context";
import { switchLocalePath } from "../../i18n/paths";
import { rememberLocale } from "../../i18n/storage";

type LocaleLinks = Partial<Record<Locale, string>>;

/**
 * Pages whose URL differs per language (blog posts have translated slugs)
 * return `localeLinks` from their loader; other pages only swap the prefix.
 */
function usePageLocaleLinks(): LocaleLinks | undefined {
  const matches = useMatches();
  for (const match of [...matches].reverse()) {
    const links = (match.loaderData as { localeLinks?: LocaleLinks } | undefined)?.localeLinks;
    if (links) return links;
  }
  return undefined;
}

export function LocaleSwitcher() {
  const { locale, messages } = useI18n();
  const { pathname } = useLocation();
  const pageLinks = usePageLocaleLinks();

  return (
    <nav className="locale-switcher" aria-label={messages.a11y.languageSwitcher}>
      <ul>
        {locales.map((option) => {
          const info = localeInfo[option];
          return (
            <li key={option}>
              <Link
                to={pageLinks?.[option] ?? switchLocalePath(pathname, option)}
                hrefLang={info.tag}
                lang={info.tag}
                aria-current={option === locale ? "true" : undefined}
                onClick={() => {
                  if (option !== locale) track("language-change", { from: locale, to: option });
                  rememberLocale(option);
                }}
              >
                {option.toUpperCase()}
                {/* The accessible name keeps the visible code and adds the full name. */}
                <span className="visually-hidden"> · {info.nativeName}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
