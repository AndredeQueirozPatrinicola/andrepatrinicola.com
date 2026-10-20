import { isRouteErrorResponse, Outlet, useRouteLoaderData } from "react-router";

import { NotFoundView } from "../features/errors/NotFoundView";
import { I18nProvider } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import type { Route } from "./+types/locale-layout";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  return { locale, messages: getMessages(locale) };
}

export default function LocaleLayout({ loaderData }: Route.ComponentProps) {
  return (
    <I18nProvider value={loaderData}>
      <Outlet />
    </I18nProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const layout = useRouteLoaderData<typeof loader>("routes/locale-layout");

  // Without layout data the locale itself was invalid: let the root handle it.
  if (!layout || !isRouteErrorResponse(error) || error.status !== 404) {
    throw error;
  }

  const { notFound } = layout.messages;
  return (
    <I18nProvider value={layout}>
      <main id="content">
        <NotFoundView
          title={notFound.title}
          body={notFound.body}
          backLabel={notFound.back}
          backHref={localePath(layout.locale)}
        />
      </main>
    </I18nProvider>
  );
}
