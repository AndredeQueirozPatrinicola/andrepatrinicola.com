import { projects, type ProjectEntry } from "../../content/projects";
import { localize } from "../../domain/localized";
import type { Project } from "../../domain/project";
import type { Locale } from "../../i18n/config";
import { localePath } from "../../i18n/paths";
import type { ProjectsRepository } from "../repositories";

function toProject(entry: ProjectEntry, locale: Locale): Project {
  return {
    ...entry,
    summary: localize(entry.summary, locale),
    explored: localize(entry.explored, locale),
    links: entry.links.map((link) =>
      link.kind !== "source" ? { ...link, href: localePath(locale, link.href) } : link,
    ),
  };
}

export function createLocalProjectsRepository(entries: ProjectEntry[] = projects): ProjectsRepository {
  return {
    async list(locale) {
      return entries.map((entry) => toProject(entry, locale));
    },
  };
}
