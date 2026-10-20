import { Link, NavLink } from "react-router";

import { useI18n } from "../../i18n/context";
import { localePath } from "../../i18n/paths";
import { primaryNavigation } from "../../routing/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import "./site-header.css";

export function SiteHeader() {
  const { locale, messages } = useI18n();

  return (
    <header className="site-header">
      <div className="page site-header-inner">
        <Link to={localePath(locale)} className="wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          {messages.site.name}
        </Link>

        {primaryNavigation.length > 0 && (
          <nav className="primary-nav" aria-label={messages.a11y.primaryNav}>
            <ul>
              {primaryNavigation.map((item) => (
                <li key={item.key}>
                  <NavLink to={localePath(locale, item.path)}>{messages.nav[item.key]}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="site-header-tools">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
