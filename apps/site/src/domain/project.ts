export type ProjectStatus = "active" | "in-progress" | "experiment";

export type ProjectLink =
  | { kind: "source"; href: string }
  | { kind: "page"; href: string };

export type Project = {
  slug: string;
  title: string;
  status: ProjectStatus;
  year?: number;
  summary: string;
  /** What the project was a way to learn or try, taken from its code. */
  explored: string[];
  tech: string[];
  links: ProjectLink[];
  /** Optional short excerpt of the project's own source. */
  snippet?: { language: string; caption: string; code: string };
};
