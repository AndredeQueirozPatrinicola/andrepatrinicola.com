import { Link } from "react-router";

import { PixelIcon } from "../../components/ui/PixelIcon";
import type { Project } from "../../domain/project";
import { useI18n } from "../../i18n/context";

export function ProjectEntry({ project, index }: { project: Project; index: number }) {
  const { messages } = useI18n();
  const text = messages.labs;

  return (
    <article className="lab" aria-labelledby={`lab-${project.slug}`}>
      <header className="lab-header">
        <p className="lab-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </p>
        <div>
          <h2 id={`lab-${project.slug}`}>{project.title}</h2>
          <ul className="lab-meta">
            <li data-status={project.status}>{text.status[project.status]}</li>
            {project.year && <li>{project.year}</li>}
          </ul>
        </div>
      </header>

      <div className="lab-body">
        <p className="lab-summary">{project.summary}</p>

        <h3 className="label">{text.explored}</h3>
        <ul className="lab-explored">
          {project.explored.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {project.snippet && (
          <figure className="lab-snippet">
            <pre>
              <code>{project.snippet.code}</code>
            </pre>
            <figcaption className="label">{project.snippet.caption}</figcaption>
          </figure>
        )}
      </div>

      <footer className="lab-footer">
        <ul className="tag-list">
          {project.tech.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
        <ul className="lab-links">
          {project.links.map((link) =>
            link.kind === "source" ? (
              <li key={link.href}>
                <a href={link.href} rel="noreferrer">
                  {text.source}
                  <PixelIcon name="external" size={12} />
                </a>
              </li>
            ) : (
              <li key={link.href}>
                <Link to={link.href}>
                  {text.page}
                  <PixelIcon name="arrow" size={12} />
                </Link>
              </li>
            ),
          )}
        </ul>
      </footer>
    </article>
  );
}
