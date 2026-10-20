import { Link, useLocation } from "react-router";

import { localeInfo, locales } from "../../i18n/config";
import { useI18n } from "../../i18n/context";
import { switchLocalePath } from "../../i18n/paths";
import { rememberLocale } from "../../i18n/storage";

export function LocaleSwitcher() {
  const { locale, messages } = useI18n();
  const { pathname } = useLocation();

  return (
    <nav className="locale-switcher" aria-label={messages.a11y.languageSwitcher}>
      <ul>
        {locales.map((option) => {
          const info = localeInfo[option];
          return (
            <li key={option}>
              <Link
                to={switchLocalePath(pathname, option)}
                hrefLang={info.tag}
                lang={info.tag}
                aria-current={option === locale ? "true" : undefined}
                onClick={() => rememberLocale(option)}
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
