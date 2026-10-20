import { PageIntro } from "../components/ui/PageIntro";
import { repositories } from "../data";
import { ProjectEntry } from "../features/labs/ProjectEntry";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/labs";

import "../features/labs/labs.css";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  return {
    projects: await repositories.projects.list(locale),
    meta: buildMeta({
      title: messages.labs.title,
      siteName: messages.site.name,
      description: messages.labs.intro,
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function LabsRoute({ loaderData }: Route.ComponentProps) {
  const { messages } = useI18n();

  return (
    <div className="page">
      <PageIntro eyebrow={messages.labs.eyebrow} title={messages.labs.title} lead={messages.labs.intro} />
      <div className="labs">
        {loaderData.projects.map((project, index) => (
          <ProjectEntry key={project.slug} project={project} index={index} />
        ))}
      </div>
    </div>
  );
}
