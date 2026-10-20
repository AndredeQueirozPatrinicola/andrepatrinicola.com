/** Year and month, e.g. "2024-05". */
export type YearMonth = `${number}-${number}`;

export type Skill = { id: string; name: string };

export type SkillArea = {
  id: string;
  title: string;
  /** Where the area comes from, when not from professional work. */
  note?: string;
  skills: Skill[];
};

export type Experience = {
  id: string;
  role: string;
  company: string;
  start: YearMonth;
  /** Absent while the position is current. */
  end?: YearMonth;
  context: string;
  highlights: string[];
  /** Skill ids used in this position, as documented in the résumé. */
  skills: string[];
};

export type ResumeProject = {
  id: string;
  title: string;
  description: string;
  /** Internal path or external URL. */
  href: string;
  skills: string[];
};

export type Education = {
  degree: string;
  institution: string;
  start: number;
  end: number;
  note: string;
};

export type SpokenLanguage = { name: string; level: string };

export type ResumeDocument = { label: string; href: string; language: string };

export type Resume = {
  summary: string;
  experiences: Experience[];
  skillAreas: SkillArea[];
  projects: ResumeProject[];
  education: Education[];
  languages: SpokenLanguage[];
  documents: ResumeDocument[];
};
