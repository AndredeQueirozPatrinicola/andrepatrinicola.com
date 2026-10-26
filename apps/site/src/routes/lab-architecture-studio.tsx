import { useSyncExternalStore } from "react";
import { Link, useLocation, useSearchParams } from "react-router";

import { track } from "../analytics/umami";
import { PixelIcon } from "../components/ui/PixelIcon";
import { studioMessages } from "../features/architecture-studio/messages";
import { StartPanel } from "../features/architecture-studio/StartPanel";
import { StudioLoader, studioRequest } from "../features/architecture-studio/StudioLoader";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import { breadcrumbSchema } from "../seo/structured-data";
import type { Route } from "./+types/lab-architecture-studio";

import "../features/architecture-studio/architecture-studio.css";

export { shouldRevalidate } from "../i18n/route";

const LAB_PATH = "/labs/architecture-studio";
const SOURCE_URL = "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com/tree/main/apps/site/src/features/architecture-studio";
const TECH = ["TypeScript", "React", "React Flow", "Zod", "AWS Architecture Icons"];

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const text = studioMessages(locale);
  return {
    text,
    meta: buildMeta({
      locale,
      path: LAB_PATH,
      title: text.title,
      siteName: messages.site.name,
      description: text.description,
      jsonLd: [
        breadcrumbSchema([
          { name: messages.labs.title, path: localePath(locale, "/labs") },
          { name: text.title, path: localePath(locale, LAB_PATH) },
        ]),
      ],
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

const noSubscription = () => () => undefined;

/** False while hydrating the pre-rendered HTML (which never contains the editor), true afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

export default function ArchitectureStudioRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { text } = loaderData;
  const [params] = useSearchParams();
  const location = useLocation();
  const hydrated = useHydrated();
  const request = studioRequest(params);
  const basePath = localePath(locale, LAB_PATH);

  if (hydrated && request) {
    // Keyed by navigation: opening another diagram starts a fresh editor.
    return <StudioLoader key={location.key} request={request} locale={locale} text={text} basePath={basePath} />;
  }

  return (
    <div className="page as-page">
      <nav className="breadcrumb" aria-label={text.breadcrumb}>
        <ol>
          <li>
            <Link to={localePath(locale, "/labs")}>{messages.labs.title}</Link>
          </li>
          <li aria-current="page">{text.title}</li>
        </ol>
      </nav>

      <header className="as-header">
        <h1>{text.title}</h1>
        <p className="as-lead">{text.lead}</p>
      </header>

      <StartPanel text={text} />

      <div className="as-notes">
        <section aria-labelledby="as-offers">
          <h2 id="as-offers" className="label">
            {text.offers.title}
          </h2>
          <ul className="as-list">
            {text.offers.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="as-privacy">
          <h2 id="as-privacy" className="label">
            {text.privacy.title}
          </h2>
          <p>{text.privacy.body}</p>
        </section>
        <section aria-labelledby="as-a11y">
          <h2 id="as-a11y" className="label">
            {text.accessibility.title}
          </h2>
          <p>{text.accessibility.body}</p>
        </section>
      </div>

      <footer className="as-footer">
        <div>
          <h2 className="label">{text.tech.title}</h2>
          <ul className="tag-list">
            {TECH.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
          <p className="as-attribution">{text.attribution}</p>
        </div>
        <a href={SOURCE_URL} rel="noreferrer" onClick={() => track("project-source", { project: "architecture-studio", location: "lab" })}>
          {text.tech.source}
          <PixelIcon name="external" size={12} />
        </a>
      </footer>
    </div>
  );
}
