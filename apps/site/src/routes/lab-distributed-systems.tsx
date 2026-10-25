import { Link } from "react-router";

import { track } from "../analytics/umami";
import { PixelIcon } from "../components/ui/PixelIcon";
import { queueLabMessages } from "../features/queue-lab/messages";
import { SimulationLab } from "../features/queue-lab/SimulationLab";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import { breadcrumbSchema } from "../seo/structured-data";
import type { Route } from "./+types/lab-distributed-systems";

import "../features/queue-lab/queue-lab.css";

export { shouldRevalidate } from "../i18n/route";

const LAB_PATH = "/labs/distributed-systems";
const SOURCE_URL = "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com/tree/main/apps/site/src/features/queue-lab";
const TECH = ["TypeScript", "React", "SVG", "Amazon SQS", "AWS Lambda", "DynamoDB", "Terraform"];

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const text = queueLabMessages(locale);
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

export default function DistributedSystemsLabRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { text } = loaderData;

  return (
    <div className="page ql-page">
      <nav className="breadcrumb" aria-label={text.breadcrumb}>
        <ol>
          <li>
            <Link to={localePath(locale, "/labs")}>{messages.labs.title}</Link>
          </li>
          <li aria-current="page">{text.title}</li>
        </ol>
      </nav>

      <header className="ql-header">
        <h1>{text.title}</h1>
        <p className="ql-lead">{text.lead}</p>
        <p className="ql-mode" data-mode="simulation">
          <strong>{text.mode.label}</strong>
          <span>{text.mode.body}</span>
        </p>
      </header>

      <SimulationLab text={text} />

      <section className="ql-concepts" aria-labelledby="ql-concepts">
        <h2 id="ql-concepts" className="label">
          {text.concepts.title}
        </h2>
        <ul>
          {text.concepts.items.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="ql-notes">
        <section aria-labelledby="ql-simplifications">
          <h2 id="ql-simplifications" className="label">
            {text.simplifications.title}
          </h2>
          <ul className="ql-list">
            {text.simplifications.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="ql-live-note" aria-labelledby="ql-live">
          <h2 id="ql-live" className="label">
            {text.live.title}
          </h2>
          <p>{text.live.body}</p>
          <ol className="ql-list">
            {text.live.flow.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ol>
          <p className="ql-mode" data-mode="live">
            <span>{text.live.restricted}</span>
          </p>
        </section>
      </div>

      <footer className="ql-footer">
        <div>
          <h2 className="label">{text.tech.title}</h2>
          <ul className="tag-list">
            {TECH.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
        <a href={SOURCE_URL} rel="noreferrer" onClick={() => track("project-source", { project: "distributed-systems", location: "lab" })}>
          {text.tech.source}
          <PixelIcon name="external" size={12} />
        </a>
      </footer>
    </div>
  );
}
