/**
 * The site's own content as plain-text documents for the portfolio
 * assistant's knowledge base: profile, résumé, lab projects and games, in
 * every language, built from the same repositories the pages render (so
 * nothing goes beyond what the site already shows: no phone number, no PDF
 * contents). Blog articles are not here: the API exports them from the
 * published snapshot.
 *
 * Rendered at build time by routes/ai-knowledge.ts, moved out of the public
 * package by scripts/assemble-deploy.mjs and sent to the API by
 * scripts/ai/upload-knowledge.mjs. The contract is validated by the API
 * (andrepatrinicola-api, src/ai/ingestion/site-knowledge.ts).
 */
import type { Repositories } from "../../data/repositories";
import type { Game } from "../../domain/game";
import type { Project } from "../../domain/project";
import { locales, type Locale } from "../../i18n/config";
import { localePath } from "../../i18n/paths";

export type KnowledgeDocument = {
  sourceId: string;
  locale: Locale;
  title: string;
  /** Page of this site that shows the content. */
  path: string;
  /** Markdown. */
  body: string;
};

export type SiteKnowledge = { schemaVersion: 1; generatedAt: string; documents: KnowledgeDocument[] };

type Labels = {
  contact: string;
  contactBody: (email: string) => string;
  experience: string;
  skills: string;
  projects: string;
  education: string;
  languages: string;
  present: string;
  pdf: string;
  technologies: string;
  details: string;
  year: string;
  status: Record<Project["status"], string>;
  sourceCode: (name: string) => string;
  game: string;
  goal: string;
  gameStatus: Record<Game["status"], string>;
  experienceSkills: string;
};

const labels: Record<Locale, Labels> = {
  pt: {
    contact: "Contato",
    contactBody: (email) =>
      `E-mail: ${email}. Também há LinkedIn e GitHub, com os links na página Sobre, e um formulário de contato na mesma página.`,
    experience: "Experiência profissional",
    skills: "Competências",
    projects: "Projetos pessoais",
    education: "Formação",
    languages: "Idiomas",
    present: "atual",
    pdf: "O currículo em PDF pode ser baixado na página Currículo, em português e em inglês.",
    technologies: "Tecnologias",
    details: "Detalhes técnicos",
    year: "Ano",
    status: { active: "ativo", "in-progress": "em desenvolvimento", experiment: "experimento" },
    sourceCode: (name) => `Código-fonte público no GitHub (${name}).`,
    game: "Jogo para o navegador",
    goal: "Objetivo",
    gameStatus: { playable: "jogável", prototype: "protótipo" },
    experienceSkills: "Competências usadas",
  },
  en: {
    contact: "Contact",
    contactBody: (email) => `E-mail: ${email}. There are also LinkedIn and GitHub profiles, linked on the About page, and a contact form on the same page.`,
    experience: "Professional experience",
    skills: "Skills",
    projects: "Personal projects",
    education: "Education",
    languages: "Languages",
    present: "present",
    pdf: "The résumé can be downloaded as a PDF on the Résumé page, in Portuguese and English.",
    technologies: "Technologies",
    details: "Technical details",
    year: "Year",
    status: { active: "active", "in-progress": "in progress", experiment: "experiment" },
    sourceCode: (name) => `Public source code on GitHub (${name}).`,
    game: "Browser game",
    goal: "Goal",
    gameStatus: { playable: "playable", prototype: "prototype" },
    experienceSkills: "Skills used",
  },
  es: {
    contact: "Contacto",
    contactBody: (email) =>
      `Correo electrónico: ${email}. También hay perfiles de LinkedIn y GitHub, enlazados en la página Sobre mí, y un formulario de contacto en la misma página.`,
    experience: "Experiencia profesional",
    skills: "Competencias",
    projects: "Proyectos personales",
    education: "Formación",
    languages: "Idiomas",
    present: "actual",
    pdf: "El currículum en PDF se puede descargar en la página Currículum, en portugués y en inglés.",
    technologies: "Tecnologías",
    details: "Detalles técnicos",
    year: "Año",
    status: { active: "activo", "in-progress": "en desarrollo", experiment: "experimento" },
    sourceCode: (name) => `Código fuente público en GitHub (${name}).`,
    game: "Juego para el navegador",
    goal: "Objetivo",
    gameStatus: { playable: "jugable", prototype: "prototipo" },
    experienceSkills: "Competencias utilizadas",
  },
};

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
const repositoryName = (url: string | undefined) => url?.match(/github\.com\/[^/]+\/([^/]+)/)?.[1];

async function profileDocument(repositories: Repositories, locale: Locale, text: Labels): Promise<KnowledgeDocument> {
  const profile = await repositories.profile.get(locale);
  return {
    sourceId: "profile:about",
    locale,
    title: profile.name,
    path: localePath(locale, "/about"),
    body: [`${profile.role} · ${profile.location}`, profile.summary, `## ${text.contact}`, text.contactBody(profile.email)].join("\n\n"),
  };
}

async function resumeDocument(repositories: Repositories, locale: Locale, text: Labels, title: string): Promise<KnowledgeDocument> {
  const resume = await repositories.resume.get(locale);
  const skillNames = new Map(resume.skillAreas.flatMap((area) => area.skills.map((skill) => [skill.id, skill.name] as const)));
  const names = (ids: string[]) => ids.map((id) => skillNames.get(id) ?? id).join(", ");

  const experiences = resume.experiences.map((experience) =>
    [
      `### ${experience.role} — ${experience.company} (${experience.start} – ${experience.end ?? text.present})`,
      experience.context,
      list(experience.highlights),
      `${text.experienceSkills}: ${names(experience.skills)}.`,
    ].join("\n\n"),
  );
  const skills = resume.skillAreas.map(
    (area) => `- ${area.title}${area.note ? ` (${area.note.toLowerCase()})` : ""}: ${area.skills.map((skill) => skill.name).join(", ")}`,
  );
  const projects = resume.projects.map((project) => `- ${project.title}: ${project.description}`);
  const education = resume.education.map((entry) => `- ${entry.degree}, ${entry.institution} (${entry.start}–${entry.end}). ${entry.note}.`);
  const languages = resume.languages.map((language) => `- ${language.name}: ${language.level}`);

  return {
    sourceId: "resume:resume",
    locale,
    title,
    path: localePath(locale, "/resume"),
    body: [
      resume.summary,
      `## ${text.experience}`,
      ...experiences,
      `## ${text.skills}`,
      skills.join("\n"),
      `## ${text.projects}`,
      projects.join("\n"),
      `## ${text.education}`,
      education.join("\n"),
      `## ${text.languages}`,
      languages.join("\n"),
      text.pdf,
    ].join("\n\n"),
  };
}

function projectDocument(project: Project, locale: Locale, text: Labels): KnowledgeDocument {
  const source = project.links.find((link) => link.kind === "source");
  const repository = repositoryName(source?.href);
  return {
    sourceId: `project:${project.slug}`,
    locale,
    title: project.title,
    path: localePath(locale, `/labs#lab-${project.slug}`),
    body: [
      `Labs · ${text.status[project.status]}${project.year ? ` · ${text.year} ${project.year}` : ""}`,
      project.summary,
      `${text.technologies}: ${project.tech.join(", ")}.`,
      `## ${text.details}`,
      list(project.explored),
      ...(repository ? [text.sourceCode(repository)] : []),
    ].join("\n\n"),
  };
}

function gameDocument(game: Game, locale: Locale, text: Labels): KnowledgeDocument {
  const repository = repositoryName(game.sourceUrl);
  return {
    sourceId: `game:${game.slug}`,
    locale,
    title: game.title,
    path: localePath(locale, `/games/${game.slug}`),
    body: [
      `${text.game} · ${text.gameStatus[game.status]} · ${text.year} ${game.year}`,
      game.tagline,
      `${text.goal}: ${game.goal}`,
      `${text.technologies}: ${game.tech.join(", ")}.`,
      `## ${text.details}`,
      list(game.internals),
      ...(repository ? [text.sourceCode(repository)] : []),
    ].join("\n\n"),
  };
}

/** Every document, in every language. `resumeTitles` are the résumé page titles per language. */
export async function buildSiteKnowledge(repositories: Repositories, resumeTitles: Record<Locale, string>, now = new Date()): Promise<SiteKnowledge> {
  const documents: KnowledgeDocument[] = [];
  for (const locale of locales) {
    const text = labels[locale];
    documents.push(await profileDocument(repositories, locale, text));
    documents.push(await resumeDocument(repositories, locale, text, resumeTitles[locale]));
    for (const project of await repositories.projects.list(locale)) documents.push(projectDocument(project, locale, text));
    for (const game of await repositories.games.list(locale)) documents.push(gameDocument(game, locale, text));
  }
  return { schemaVersion: 1, generatedAt: now.toISOString(), documents };
}
