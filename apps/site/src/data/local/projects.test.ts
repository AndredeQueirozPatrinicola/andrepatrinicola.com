import { describe, expect, it } from "vitest";

import { projects } from "../../content/projects";
import { locales } from "../../i18n/config";
import { createLocalProjectsRepository } from "./projects";

describe("local projects repository", () => {
  it("localizes text and internal links", async () => {
    const list = await createLocalProjectsRepository().list("es");
    const engine = list.find((project) => project.slug === "andevengine")!;
    const lab = list.find((project) => project.slug === "distributed-systems")!;

    expect(engine.summary).toMatch(/^Motor 2D en TypeScript/);
    expect(engine.links).toContainEqual({ kind: "page", href: "/es/games" });
    expect(lab.links).toContainEqual({ kind: "lab", href: "/es/labs/distributed-systems" });
  });

  it("has unique slugs and the same number of items in every language", () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
    for (const project of projects) {
      for (const locale of locales) {
        expect(project.explored[locale]).toHaveLength(project.explored.pt.length);
      }
    }
  });
});
