import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import plexFont from "./assets/fonts/ibm-plex-sans-400.woff2?url";
import displayFont from "./assets/fonts/vcr-osd-mono.woff2?url";
import { NotFoundView } from "./features/errors/NotFoundView";
import { defaultLocale, localeInfo } from "./i18n/config";
import { localePath } from "./i18n/paths";
import type { loader as localeLoader } from "./routes/locale-layout";
import { isStaticRoute } from "./routing/static-route";
import { themeInitScript } from "./theme/theme";
import "./styles/tokens.css";
import "./styles/fonts.css";
import "./styles/base.css";
import "./styles/layout.css";

export const links: Route.LinksFunction = () => [
  ...[displayFont, plexFont].map((href) => ({
    rel: "preload",
    href,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous" as const,
  })),
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export function Layout({ children }: { children: ReactNode }) {
  const localeData = useRouteLoaderData<typeof localeLoader>("routes/locale-layout");
  const locale = localeData?.locale ?? defaultLocale;
  const isStatic = useMatches().some(isStaticRoute);

  return (
    // The theme script sets data-theme before hydration.
    <html lang={localeInfo[locale].tag} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f7f7f7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        {!isStatic && <ScrollRestoration />}
        {!isStatic && <Scripts />}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/** Last resort: errors outside a localized route (Portuguese fallback). */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main id="content" className="app-main">
      <NotFoundView
        code={notFound ? "404" : ""}
        title={notFound ? "Página não encontrada" : "Algo deu errado"}
        body={
          notFound
            ? "O endereço pode ter mudado ou nunca ter existido."
            : "Não foi possível carregar esta página. Tente recarregar."
        }
        backLabel="Voltar ao início"
        backHref={localePath(defaultLocale)}
      />
    </main>
  );
}
