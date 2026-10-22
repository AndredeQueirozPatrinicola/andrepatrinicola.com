import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SITE_URL } from "../seo/site";
import { loader } from "./sitemap";

// Vitest runs from apps/site.
const fixture = resolve("e2e/fixtures/blog-snapshot.json");
let previous: string | undefined;

beforeAll(() => {
  previous = process.env.CONTENT_SNAPSHOT;
  process.env.CONTENT_SNAPSHOT = fixture;
});
afterAll(() => {
  if (previous === undefined) delete process.env.CONTENT_SNAPSHOT;
  else process.env.CONTENT_SNAPSHOT = previous;
});

describe("sitemap", () => {
  it("lists the blog in every language and each post with its own translations", async () => {
    const xml = await (await loader()).text();
    expect(xml).toContain(`<loc>${SITE_URL}/es/blog</loc>`);

    const post = xml.split("<url>").find((url) => url.includes(`<loc>${SITE_URL}/en/blog/portfolio-serverless-architecture</loc>`));
    expect(post).toContain("<lastmod>2026-10-18</lastmod>");
    expect(post).toContain(`hreflang="pt-BR" href="${SITE_URL}/pt/blog/arquitetura-serverless-do-portfolio"`);
    expect(post).not.toContain('hreflang="es"');

    // Redirected (older) slugs are not listed.
    expect(xml).not.toContain("arquitetura-do-portfolio<");
  });
});
