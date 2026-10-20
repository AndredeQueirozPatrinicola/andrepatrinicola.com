import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import { track } from "../../analytics/umami";
import { PixelIcon } from "../../components/ui/PixelIcon";
import type { Resume } from "../../domain/resume";
import { useI18n } from "../../i18n/context";
import { format } from "../../i18n/format";

import "./resume.css";

export type ExperiencePeriod = { start: string; end: string; startISO: string; endISO?: string };

type ResumeViewProps = {
  resume: Resume;
  /** Formatted at build time, keyed by experience id. */
  periods: Record<string, ExperiencePeriod>;
};

const SECTIONS = ["experience", "skills", "projects", "education", "languages"] as const;

type SkillTagsProps = {
  skills: string[];
  names: Map<string, string>;
  active: string | null;
  label: string;
};

function SkillTags({ skills, names, active, label }: SkillTagsProps) {
  return (
    <ul className="resume-tags" aria-label={label}>
      {skills.map((id) => (
        <li key={id} data-active={id === active || undefined}>
          {names.get(id) ?? id}
        </li>
      ))}
    </ul>
  );
}

/**
 * The résumé as a page: a sticky index, a timeline of experiences and a skill
 * map. Choosing a skill highlights the experiences and projects that use it,
 * so every technology is tied to concrete work instead of a rating.
 */
export function ResumeView({ resume, periods }: ResumeViewProps) {
  const { messages } = useI18n();
  const text = messages.resume;
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const skillMapRef = useRef<HTMLDivElement>(null);

  function clearHighlight() {
    const chip = skillMapRef.current?.querySelector<HTMLButtonElement>(`[data-skill="${activeSkill}"]`);
    setActiveSkill(null);
    // The Clear button disappears; keep keyboard focus on the chip that was chosen.
    chip?.focus();
  }

  const skillNames = useMemo(
    () => new Map(resume.skillAreas.flatMap((area) => area.skills.map((skill) => [skill.id, skill.name]))),
    [resume.skillAreas],
  );

  const uses = (skills: string[]) => (activeSkill ? skills.includes(activeSkill) : undefined);
  const matchCount = activeSkill
    ? [...resume.experiences, ...resume.projects].filter((item) => item.skills.includes(activeSkill)).length
    : 0;

  return (
    <div className="resume" data-filtering={activeSkill ? "" : undefined}>
      <aside className="resume-index">
        <nav aria-labelledby="resume-index-title">
          <h2 id="resume-index-title" className="label">
            {text.onThisPage}
          </h2>
          <ol>
            {SECTIONS.map((section) => (
              <li key={section}>
                <a href={`#${section}`}>{text.sections[section]}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="resume-downloads">
          <h2 className="label">{text.downloads}</h2>
          <ul>
            {resume.documents.map((document) => (
              <li key={document.href}>
                <a
                  href={document.href}
                  hrefLang={document.language}
                  download
                  onClick={() => track("resume-download", { language: document.language })}
                >
                  {document.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="resume-content">
        <section id="experience" className="resume-section" aria-labelledby="experience-title">
          <h2 id="experience-title" className="resume-section-title">
            {text.sections.experience}
          </h2>
          <ol className="timeline">
            {resume.experiences.map((experience) => {
              const period = periods[experience.id];
              return (
                <li key={experience.id} className="timeline-item" data-match={uses(experience.skills)}>
                  <p className="timeline-period">
                    <time dateTime={period.startISO}>{period.start}</time>
                    {" – "}
                    {period.endISO ? <time dateTime={period.endISO}>{period.end}</time> : period.end}
                  </p>
                  <div className="timeline-body">
                    <h3>
                      {experience.role} <span className="timeline-company">· {experience.company}</span>
                    </h3>
                    <p className="timeline-context">{experience.context}</p>
                    <ul className="timeline-highlights">
                      {experience.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                    <SkillTags skills={experience.skills} names={skillNames} active={activeSkill} label={text.stack} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="skills" className="resume-section" aria-labelledby="skills-title">
          <h2 id="skills-title" className="resume-section-title">
            {text.sections.skills}
          </h2>
          <p className="resume-hint">{text.skillsHint}</p>
          <div className="skill-map" ref={skillMapRef}>
            {resume.skillAreas.map((area) => (
              <div key={area.id} className="skill-area">
                <h3 className="label">
                  {area.title}
                  {area.note && <span className="skill-area-note"> · {area.note}</span>}
                </h3>
                <ul>
                  {area.skills.map((skill) => (
                    <li key={skill.id}>
                      <button
                        type="button"
                        className="skill-chip"
                        data-skill={skill.id}
                        aria-pressed={activeSkill === skill.id}
                        onClick={() => {
                          if (activeSkill !== skill.id) track("skill-highlight", { skill: skill.id });
                          setActiveSkill((current) => (current === skill.id ? null : skill.id));
                        }}
                      >
                        {skill.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="skill-status">
            <p role="status">
              {activeSkill && format(text.highlighting, { skill: skillNames.get(activeSkill) ?? activeSkill })}
              {activeSkill && matchCount === 0 && ` ${text.noMatches}`}
            </p>
            {activeSkill && (
              <button type="button" className="skill-clear" onClick={clearHighlight}>
                {text.clear}
              </button>
            )}
          </div>
        </section>

        <section id="projects" className="resume-section" aria-labelledby="projects-title">
          <h2 id="projects-title" className="resume-section-title">
            {text.sections.projects}
          </h2>
          <ul className="resume-projects">
            {resume.projects.map((project) => {
              const external = project.href.startsWith("http");
              return (
                <li key={project.id} data-match={uses(project.skills)}>
                  <h3>
                    {external ? (
                      <a
                        href={project.href}
                        rel="noreferrer"
                        onClick={() => track("resume-project", { project: project.id })}
                      >
                        {project.title}
                        <PixelIcon name="external" size={12} />
                      </a>
                    ) : (
                      <Link to={project.href}>{project.title}</Link>
                    )}
                  </h3>
                  <p>{project.description}</p>
                  <SkillTags skills={project.skills} names={skillNames} active={activeSkill} label={text.stack} />
                </li>
              );
            })}
          </ul>
        </section>

        <div className="resume-pair">
          <section id="education" className="resume-section" aria-labelledby="education-title">
            <h2 id="education-title" className="resume-section-title">
              {text.sections.education}
            </h2>
            {resume.education.map((entry) => (
              <div key={entry.degree} className="resume-education">
                <p className="timeline-period">
                  {entry.start} – {entry.end}
                </p>
                <h3>{entry.degree}</h3>
                <p>{entry.institution}</p>
                <p className="resume-muted">{entry.note}</p>
              </div>
            ))}
          </section>

          <section id="languages" className="resume-section" aria-labelledby="languages-title">
            <h2 id="languages-title" className="resume-section-title">
              {text.sections.languages}
            </h2>
            <dl className="resume-languages">
              {resume.languages.map((language) => (
                <div key={language.name}>
                  <dt>{language.name}</dt>
                  <dd>{language.level}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
