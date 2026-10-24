import { useEffect, useRef, useState, type ReactNode } from "react";
import { isRouteErrorResponse, Outlet, useLocation, useRouteLoaderData } from "react-router";

import { useAnalyticsConsent } from "../analytics/useAnalyticsConsent";
import { ConsentBanner } from "../components/layout/ConsentBanner";
import { AssistantLauncher } from "../features/assistant/AssistantLauncher";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import { SkipLink } from "../components/layout/SkipLink";
import { repositories } from "../data";
import type { Profile } from "../domain/profile";
import { NotFoundView } from "../features/errors/NotFoundView";
import type { Locale } from "../i18n/config";
import { I18nProvider } from "../i18n/context";
import { getMessages, type Messages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import type { Route } from "./+types/locale-layout";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  return {
    locale,
    messages: getMessages(locale),
    profile: await repositories.profile.get(locale),
  };
}

type ShellProps = {
  locale: Locale;
  messages: Messages;
  profile: Profile;
  children: ReactNode;
};

/**
 * After a client-side navigation, moves focus to the new page's content so
 * screen readers start there instead of staying on the clicked link.
 */
function useFocusOnNavigation() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.getElementById("content")?.focus({ preventScroll: true });
  }, [pathname]);
}

function Shell({ locale, messages, profile, children }: ShellProps) {
  useFocusOnNavigation();
  const [consent, setConsent] = useAnalyticsConsent();
  const [managingConsent, setManagingConsent] = useState(false);
  const showConsent = consent === null || managingConsent;

  return (
    <I18nProvider value={{ locale, messages }}>
      <div className="app">
        <SkipLink />
        <SiteHeader />
        <main id="content" className="app-main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter profile={profile} onManageConsent={() => setManagingConsent(true)} />
        {/* Below the consent banner on small screens: hidden while the banner is up. */}
        <AssistantLauncher concealed={showConsent} />
        {showConsent && (
          <ConsentBanner
            onChoose={(choice) => {
              setConsent(choice);
              setManagingConsent(false);
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}

export default function LocaleLayout({ loaderData }: Route.ComponentProps) {
  return (
    <Shell {...loaderData}>
      <Outlet />
    </Shell>
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
    <Shell {...layout}>
      <NotFoundView
        title={notFound.title}
        body={notFound.body}
        backLabel={notFound.back}
        backHref={localePath(layout.locale)}
      />
    </Shell>
  );
}
