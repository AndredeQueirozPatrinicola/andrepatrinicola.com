import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSnapshot, parseSnapshot, snapshotPath } from "./content";

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

describe("loadSnapshot", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads a new snapshot when the file changes (local publishing)", () => {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-"));
    const path = join(dir, "blog-snapshot.json");
    vi.stubEnv("CONTENT_SNAPSHOT", path);
    try {
      expect(loadSnapshot().articles).toEqual([]);

      writeFileSync(path, JSON.stringify(snapshot([article])));
      utimesSync(path, new Date(1_000_000), new Date(1_000_000));
      expect(loadSnapshot().articles).toHaveLength(1);
      expect(loadSnapshot()).toBe(loadSnapshot());

      writeFileSync(path, JSON.stringify(snapshot([])));
      utimesSync(path, new Date(2_000_000), new Date(2_000_000));
      expect(loadSnapshot().articles).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
