import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { contentTypes, type ContentSnapshot } from "../../domain/blog";
import { isLocale } from "../../i18n/config";

/**
 * The blog's content comes from a Portfolio Studio snapshot fetched by the
 * deploy workflow (scripts/studio/fetch-content.mjs). It is read only at
 * build time, by loaders and the pre-render list; without a snapshot the blog
 * is simply empty.
 */
export const DEFAULT_SNAPSHOT_PATH = "content/blog-snapshot.json";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const idPattern = /^[0-9a-f-]{36}$/;

export const emptySnapshot = (): ContentSnapshot => ({
  schemaVersion: 1,
  deploymentId: "",
  sequence: 0,
  generatedAt: "",
  articles: [],
  media: [],
});

class SnapshotError extends Error {
  constructor(message: string) {
    super(`Invalid content snapshot: ${message}`);
    this.name = "SnapshotError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Checks the parts the build relies on; a malformed snapshot fails the build loudly. */
export function parseSnapshot(value: unknown): ContentSnapshot {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new SnapshotError("unsupported schemaVersion");
  if (!Array.isArray(value.articles) || !Array.isArray(value.media)) throw new SnapshotError("missing articles or media");

  value.articles.forEach((article, index) => {
    const where = `articles[${index}]`;
    if (!isRecord(article) || typeof article.id !== "string" || !idPattern.test(article.id)) {
      throw new SnapshotError(`${where}.id`);
    }
    if (!(contentTypes as readonly unknown[]).includes(article.type)) throw new SnapshotError(`${where}.type`);
    if (typeof article.publishedAt !== "string" || Number.isNaN(Date.parse(article.publishedAt))) {
      throw new SnapshotError(`${where}.publishedAt`);
    }
    if (!Array.isArray(article.locales) || !Array.isArray(article.tags)) throw new SnapshotError(`${where}.locales`);
    article.locales.forEach((locale, localeIndex) => {
      const at = `${where}.locales[${localeIndex}]`;
      if (!isRecord(locale) || !isLocale(locale.locale)) throw new SnapshotError(`${at}.locale`);
      if (typeof locale.slug !== "string" || !slugPattern.test(locale.slug)) throw new SnapshotError(`${at}.slug`);
      if (typeof locale.title !== "string" || !locale.title) throw new SnapshotError(`${at}.title`);
      if (!isRecord(locale.content) || locale.content.type !== "doc") throw new SnapshotError(`${at}.content`);
      if (!Array.isArray(locale.previousSlugs) || !locale.previousSlugs.every((slug) => typeof slug === "string" && slugPattern.test(slug))) {
        throw new SnapshotError(`${at}.previousSlugs`);
      }
    });
  });

  value.media.forEach((media, index) => {
    if (!isRecord(media) || typeof media.id !== "string" || !idPattern.test(media.id)) throw new SnapshotError(`media[${index}].id`);
    if (!Number.isInteger(media.width) || !Number.isInteger(media.height)) throw new SnapshotError(`media[${index}] size`);
  });

  return value as unknown as ContentSnapshot;
}

/**
 * CONTENT_SNAPSHOT may be relative to where npm was started (INIT_CWD), so the
 * same value works from the repository root and from apps/site.
 */
export function snapshotPath(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  const configured = env.CONTENT_SNAPSHOT;
  if (!configured) return resolve(cwd, DEFAULT_SNAPSHOT_PATH);
  return isAbsolute(configured) ? configured : resolve(env.INIT_CWD ?? cwd, configured);
}

let cached: { path: string; modified: number; snapshot: ContentSnapshot } | undefined;

/**
 * Read once per file version: a new snapshot (a local publish while the dev
 * server runs) is picked up on the next request without a restart.
 */
export function loadSnapshot(): ContentSnapshot {
  const path = snapshotPath();
  const modified = statSync(path, { throwIfNoEntry: false })?.mtimeMs ?? -1;
  if (cached?.path === path && cached.modified === modified) return cached.snapshot;
  const snapshot = modified < 0 ? emptySnapshot() : parseSnapshot(JSON.parse(readFileSync(path, "utf8")));
  cached = { path, modified, snapshot };
  return snapshot;
}
