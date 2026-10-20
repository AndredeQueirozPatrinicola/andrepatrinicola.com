import { Link } from "react-router";

import { PageIntro } from "../components/ui/PageIntro";
import { repositories } from "../data";
import { localeInfo } from "../i18n/config";
import { useI18n } from "../i18n/context";
import { formatYearMonth } from "../i18n/format";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/about";

import "../features/about/about.css";

export { shouldRevalidate } from "../i18n/route";

type PathKey = "fflch" | "technext" | "pixit";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const [profile, resume] = await Promise.all([
    repositories.profile.get(locale),
    repositories.resume.get(locale),
  ]);

  // Oldest first: the path reads as a progression.
  const path = [...resume.experiences].reverse().map((experience) => ({
    id: experience.id as PathKey,
    company: experience.company,
    role: experience.role,
    start: formatYearMonth(experience.start, localeInfo[locale].tag),
  }));

  return {
    profile,
    path,
    meta: buildMeta({
      title: messages.about.title,
      siteName: messages.site.name,
      description: messages.about.lead,
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function AboutRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { profile, path } = loaderData;
  const text = messages.about;

  return (
    <div className="page">
      <PageIntro eyebrow={profile.name} title={text.title} lead={text.lead} />

      <div className="about">
        <section className="about-section" aria-labelledby="about-who">
          <h2 id="about-who" className="label">
            {text.whoTitle}
          </h2>
          <div className="about-prose">
            {text.who.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-path">
          <h2 id="about-path" className="label">
            {text.pathTitle}
          </h2>
          <ol className="about-path">
            {path.map((step) => (
              <li key={step.id}>
                <p className="about-path-date">{step.start}</p>
                <h3>{step.company}</h3>
                <p className="about-path-role">{step.role}</p>
                <p>{text.path[step.id]}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-section" aria-labelledby="about-why">
          <h2 id="about-why" className="label">
            {text.whyTitle}
          </h2>
          <div className="about-prose">
            {text.why.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>
              <Link to={localePath(locale, "/games")}>{messages.home.allGames}</Link>
            </p>
          </div>
        </section>

        <section className="about-section about-contact" aria-labelledby="about-contact">
          <h2 id="about-contact" className="label">
            {text.contactTitle}
          </h2>
          <div className="about-prose">
            <p>{text.contact}</p>
            <ul className="about-links">
              {profile.links.map((link) => (
                <li key={link.kind}>
                  <a href={link.href} rel={link.kind === "email" ? undefined : "me noreferrer"}>
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to={localePath(locale, "/resume")}>{text.resumeLink}</Link>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
