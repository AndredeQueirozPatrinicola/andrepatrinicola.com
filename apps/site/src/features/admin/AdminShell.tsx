import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { useAuth } from "../../auth/AuthProvider";

const navigation = [
  { to: "/admin", label: "Painel", end: true },
  { to: "/admin/articles", label: "Artigos", end: false },
  { to: "/admin/media", label: "Mídia", end: false },
  { to: "/admin/publications", label: "Divulgação", end: false },
  { to: "/admin/settings", label: "Configurações", end: false },
];

/** Frame of every admin page: sidebar (a menu on small screens), header and content. */
export function AdminShell({ children, banner }: { children: ReactNode; banner?: ReactNode }) {
  const { email, signOut, config } = useAuth();
  const { pathname } = useLocation();
  // The menu (small screens) closes by itself when the page changes.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;
  const setMenuOpen = (toggle: (open: boolean) => boolean) => setOpenOn(toggle(menuOpen) ? pathname : null);

  return (
    <div className="admin">
      <a className="skip-link" href="#admin-content">
        Pular para o conteúdo
      </a>
      <aside className="admin-sidebar" data-open={menuOpen}>
        <div className="admin-brand">
          <Link to="/admin" className="admin-brand-link">
            <span className="wordmark-mark" aria-hidden="true" />
            Portfolio Studio
          </Link>
          <button
            type="button"
            className="admin-menu-toggle admin-icon-button"
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="visually-hidden">Menu</span>
            <span aria-hidden="true">☰</span>
          </button>
        </div>
        <nav id="admin-nav" className="admin-nav" aria-label="Portfolio Studio">
          <ul>
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="admin-account">
            <p className="admin-account-email" title={email ?? undefined}>
              {email ?? "Administrador"}
            </p>
            <a href="/pt" className="admin-link">
              Ver o site
            </a>
            <button type="button" className="admin-button" data-size="small" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </nav>
      </aside>
      <main id="admin-content" className="admin-main" tabIndex={-1}>
        {config?.local && (
          <p className="admin-banner" role="note">
            <strong>Modo local.</strong> Login simulado; os dados e a publicação são do servidor local da API ({config.apiUrl}).
          </p>
        )}
        {banner}
        {children}
      </main>
    </div>
  );
}

/** Title row of a page, with optional actions on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="admin-muted">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}
