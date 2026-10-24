import { describe, expect, it } from "vitest";

import { repositories } from "../../data";
import { games } from "../../content/games";
import { projects } from "../../content/projects";
import { locales } from "../../i18n/config";
import { buildSiteKnowledge } from "./knowledge";

const titles = { pt: "Currículo", en: "Résumé", es: "Currículum" };
const build = () => buildSiteKnowledge(repositories, titles, new Date("2026-10-23T00:00:00Z"));

describe("site knowledge for the assistant", () => {
  it("has the profile, the résumé, every project and every game in every language", async () => {
    const { schemaVersion, documents } = await build();
    expect(schemaVersion).toBe(1);
    const expected = ["profile:about", "resume:resume", ...projects.map((p) => `project:${p.slug}`), ...games.map((g) => `game:${g.slug}`)];
    for (const locale of locales) {
      expect(documents.filter((document) => document.locale === locale).map((document) => document.sourceId).sort()).toEqual([...expected].sort());
    }
  });

  it("follows the API contract (ids, paths in the document's language, size)", async () => {
    const { documents } = await build();
    const keys = new Set<string>();
    for (const document of documents) {
      expect(document.sourceId).toMatch(/^(project|game|resume|profile):[a-z0-9][a-z0-9-]{0,80}$/);
      expect(document.path).toMatch(/^\/(pt|en|es)(\/[A-Za-z0-9._~-]+)*\/?(#[A-Za-z0-9_-]{1,80})?$/);
      expect(document.path.startsWith(`/${document.locale}`)).toBe(true);
      expect(document.title.length).toBeLessThanOrEqual(150);
      expect(document.body.length).toBeGreaterThan(0);
      expect(document.body.length).toBeLessThanOrEqual(20_000);
      keys.add(`${document.sourceId}:${document.locale}`);
    }
    expect(keys.size).toBe(documents.length);
    expect(JSON.stringify({ documents }).length).toBeLessThan(512 * 1024);
  });

  it("links each document to the page that shows it", async () => {
    const { documents } = await build();
    const find = (sourceId: string, locale: string) => documents.find((d) => d.sourceId === sourceId && d.locale === locale)!;
    expect(find("project:andevengine", "es").path).toBe("/es/labs#lab-andevengine");
    expect(find("game:pong", "en").path).toBe("/en/games/pong");
    expect(find("resume:resume", "pt")).toMatchObject({ path: "/pt/resume", title: "Currículo" });
    expect(find("profile:about", "en").path).toBe("/en/about");
  });

  it("only says what the pages say: no phone number, no URLs of private places", async () => {
    const text = JSON.stringify(await build());
    expect(text).not.toMatch(/\+55|99200|\(11\)/);
    expect(text).not.toMatch(/admin|cognito|amazonaws/i);
    expect(text).toContain("andrepatrinicola@gmail.com");
    expect(text).toContain("Pixit Innovative Solutions");
  });
});
