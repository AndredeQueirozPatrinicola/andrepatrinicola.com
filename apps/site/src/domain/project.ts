export type ProjectStatus = "active" | "in-progress" | "experiment";

export type ProjectLink =
  | { kind: "source"; href: string }
  | { kind: "page"; href: string }
  /** An interactive lab page on this site. */
  | { kind: "lab"; href: string };

export type Project = {
  slug: string;
  title: string;
  status: ProjectStatus;
  year?: number;
  summary: string;
  /** Technical details, taken from the project's code. */
  explored: string[];
  tech: string[];
  links: ProjectLink[];
};
