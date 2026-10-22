import { games } from "../content/games";
import { createSnapshotBlogRepository } from "../data/snapshot/blog";
import { loadSnapshot } from "../data/snapshot/content";
import { locales } from "../i18n/config";
import { localePath } from "../i18n/paths";

/** Paths below the locale prefix that exist in every language. */
export function localizedPaths(): string[] {
  return ["", "/games", ...games.map((game) => `/games/${game.slug}`), "/labs", "/blog", "/about", "/resume"];
}

/**
 * Blog URLs come from the content snapshot: one page per published
 * language, a redirect page per earlier slug and one feed per language.
 */
export async function blogPaths(): Promise<string[]> {
  const entries = await createSnapshotBlogRepository(loadSnapshot).entries();
  return [
    ...entries.flatMap((entry) =>
      [entry.slug, ...entry.previousSlugs].map((slug) => localePath(entry.locale, `/blog/${slug}`)),
    ),
    ...locales.map((locale) => localePath(locale, "/blog/rss.xml")),
  ];
}

/** Every URL rendered to static HTML (or a file, for feeds) at build time. */
export async function getPrerenderPaths(): Promise<string[]> {
  const localized = locales.flatMap((locale) =>
    localizedPaths().map((path) => localePath(locale, path)),
  );

  return ["/", "/404", "/sitemap.xml", "/robots.txt", ...localized, ...(await blogPaths())];
}
