import { describe, expect, it } from "vitest";

import { experiences, projects, skillAreas } from "../../content/resume";
import { createLocalResumeRepository } from "./resume";

const knownSkills = new Set(skillAreas.flatMap((area) => area.skills.map((skill) => skill.id)));

describe("résumé content", () => {
  it("only references skills that exist in a skill area", () => {
    for (const item of [...experiences, ...projects]) {
      for (const skill of item.skills) {
        expect(knownSkills.has(skill), `${item.id} → ${skill}`).toBe(true);
      }
    }
  });

  it("lists experiences from the most recent", () => {
    const starts = experiences.map((experience) => experience.start);
    expect([...starts].sort().reverse()).toEqual(starts);
  });

  it("resolves a locale, keeping internal links localized", async () => {
    const resume = await createLocalResumeRepository().get("es");

    expect(resume.experiences[0].role).toBe("Desarrollador Full Stack");
    expect(resume.projects.find((project) => project.id === "games")?.href).toBe("/es/games");
    expect(resume.skillAreas[1].skills.find((skill) => skill.id === "rest")?.name).toBe("APIs REST");
    expect(resume.documents[0].href).toMatch(/\.pdf$/);
  });
});
