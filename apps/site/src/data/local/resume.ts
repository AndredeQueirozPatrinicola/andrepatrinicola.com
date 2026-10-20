import {
  education,
  experiences,
  projects,
  resumeDocuments,
  resumeSummary,
  skillAreas,
  spokenLanguages,
} from "../../content/resume";
import { localize } from "../../domain/localized";
import type { Resume } from "../../domain/resume";
import { localePath } from "../../i18n/paths";
import type { ResumeRepository } from "../repositories";

export function createLocalResumeRepository(): ResumeRepository {
  return {
    async get(locale): Promise<Resume> {
      return {
        summary: localize(resumeSummary, locale),
        experiences: experiences.map((entry) => ({
          ...entry,
          role: localize(entry.role, locale),
          context: localize(entry.context, locale),
          highlights: localize(entry.highlights, locale),
        })),
        skillAreas: skillAreas.map((area) => ({
          id: area.id,
          title: localize(area.title, locale),
          note: area.note && localize(area.note, locale),
          skills: area.skills.map((skill) => ({
            id: skill.id,
            name: typeof skill.name === "string" ? skill.name : localize(skill.name, locale),
          })),
        })),
        projects: projects.map((project) => ({
          id: project.id,
          title: project.title,
          description: localize(project.description, locale),
          href: project.path ? localePath(locale, project.path) : (project.url ?? ""),
          skills: project.skills,
        })),
        education: education.map((entry) => ({
          ...entry,
          degree: localize(entry.degree, locale),
          note: localize(entry.note, locale),
        })),
        languages: spokenLanguages.map((language) => ({
          name: localize(language.name, locale),
          level: localize(language.level, locale),
        })),
        documents: resumeDocuments[locale].map((document) => ({
          ...document,
          label: localize(document.label, locale),
        })),
      };
    },
  };
}
