import { describe, expect, it } from "vitest";

import { projects } from "../../content/projects";
import { locales } from "../../i18n/config";
import { createLocalProjectsRepository } from "./projects";

describe("local projects repository", () => {
  it("localizes text and internal links", async () => {
    const [engine] = await createLocalProjectsRepository().list("es");

    expect(engine.summary).toMatch(/^El pequeño motor/);
    expect(engine.links).toContainEqual({ kind: "page", href: "/es/games" });
    expect(engine.snippet?.caption).toBe("El bucle del motor");
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
