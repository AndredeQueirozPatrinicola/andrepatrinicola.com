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
import { NotFoundView } from "./features/errors/NotFoundView";
import { defaultLocale, localeInfo } from "./i18n/config";
import { localePath } from "./i18n/paths";
import type { loader as localeLoader } from "./routes/locale-layout";
import { isStaticRoute } from "./routing/static-route";
import "./styles/global.css";

export function Layout({ children }: { children: ReactNode }) {
  const localeData = useRouteLoaderData<typeof localeLoader>("routes/locale-layout");
  const locale = localeData?.locale ?? defaultLocale;
  const isStatic = useMatches().some(isStaticRoute);

  return (
    <html lang={localeInfo[locale].tag}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    <main id="content">
      <NotFoundView
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
