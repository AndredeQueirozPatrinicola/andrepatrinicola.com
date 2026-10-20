import { PageIntro } from "../components/ui/PageIntro";
import { repositories } from "../data";
import { ResumeView, type ExperiencePeriod } from "../features/resume/ResumeView";
import { localeInfo } from "../i18n/config";
import { useI18n } from "../i18n/context";
import { formatYearMonth } from "../i18n/format";
import { getMessages } from "../i18n/messages";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/resume";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const tag = localeInfo[locale].tag;
  const [resume, profile] = await Promise.all([
    repositories.resume.get(locale),
    repositories.profile.get(locale),
  ]);

  const periods = Object.fromEntries(
    resume.experiences.map((experience): [string, ExperiencePeriod] => [
      experience.id,
      {
        start: formatYearMonth(experience.start, tag),
        startISO: experience.start,
        end: experience.end ? formatYearMonth(experience.end, tag) : messages.resume.present,
        endISO: experience.end,
      },
    ]),
  );

  return {
    resume,
    periods,
    profile,
    meta: buildMeta({
      title: messages.resume.title,
      siteName: messages.site.name,
      description: `${profile.name} · ${profile.role}. ${resume.summary}`,
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function ResumeRoute({ loaderData }: Route.ComponentProps) {
  const { messages } = useI18n();
  const { resume, periods, profile } = loaderData;

  return (
    <div className="page">
      <PageIntro
        eyebrow={`${profile.name} · ${profile.location}`}
        title={messages.resume.title}
        lead={resume.summary}
        aside={
          <ul className="resume-contact">
            {profile.links.map((link) => (
              <li key={link.kind}>
                <a href={link.href} rel={link.kind === "email" ? undefined : "me noreferrer"}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        }
      />
      <ResumeView resume={resume} periods={periods} />
    </div>
  );
}
