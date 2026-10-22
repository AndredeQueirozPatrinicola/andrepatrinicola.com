import { describe, expect, it } from "vitest";

import { parseSnapshot, snapshotPath } from "./content";

const article = {
  id: "5a0b7f0e-1111-4c4c-8a8a-000000000001",
  type: "article",
  tags: [],
  publishedAt: "2026-10-10T12:00:00.000Z",
  locales: [{ locale: "pt", slug: "ok", previousSlugs: [], title: "T", content: { type: "doc", content: [] } }],
};
const snapshot = (articles: unknown[]) => ({ schemaVersion: 1, articles, media: [] });

describe("parseSnapshot", () => {
  it("accepts a valid snapshot", () => {
    expect(parseSnapshot(snapshot([article])).articles).toHaveLength(1);
  });

  it.each([
    ["another schema version", { ...snapshot([]), schemaVersion: 2 }],
    ["an unknown language", snapshot([{ ...article, locales: [{ ...article.locales[0], locale: "fr" }] }])],
    ["a slug with a path", snapshot([{ ...article, locales: [{ ...article.locales[0], slug: "../x" }] }])],
    ["an unknown type", snapshot([{ ...article, type: "page" }])],
    ["a body that is not a document", snapshot([{ ...article, locales: [{ ...article.locales[0], content: "<p>x</p>" }] }])],
  ])("rejects %s", (_name, value) => {
    expect(() => parseSnapshot(value)).toThrow(/Invalid content snapshot/);
  });
});

describe("snapshotPath", () => {
  it("defaults to content/ in the app", () => {
    expect(snapshotPath({}, "/repo/apps/site")).toBe("/repo/apps/site/content/blog-snapshot.json");
  });

  it("resolves CONTENT_SNAPSHOT from where npm was started", () => {
    expect(snapshotPath({ CONTENT_SNAPSHOT: "apps/site/e2e/x.json", INIT_CWD: "/repo" }, "/repo/apps/site")).toBe(
      "/repo/apps/site/e2e/x.json",
    );
    expect(snapshotPath({ CONTENT_SNAPSHOT: "/tmp/x.json" }, "/repo")).toBe("/tmp/x.json");
  });
});
