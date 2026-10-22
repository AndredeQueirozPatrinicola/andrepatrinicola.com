import { describe, expect, it } from "vitest";

import { buildMeta } from "./meta";
import { SITE_URL } from "./site";

describe("buildMeta", () => {
  const meta = buildMeta({
    locale: "es",
    path: "/games/pong",
    title: "Classic Pong",
    siteName: "André Patrinicola",
    description: "Pong clásico.",
    jsonLd: [{ "@type": "VideoGame" }],
  });

  it("titles the page and links the canonical URL", () => {
    expect(meta).toContainEqual({ title: "Classic Pong · André Patrinicola" });
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: `${SITE_URL}/es/games/pong` });
  });

  it("lists every language plus x-default", () => {
    const alternates = meta.filter((item) => "rel" in item && item.rel === "alternate");
    expect(alternates.map((item) => ("hrefLang" in item ? item.hrefLang : ""))).toEqual([
      "pt-BR",
      "en",
      "es",
      "x-default",
    ]);
  });

  it("falls back to the default share image and renders JSON-LD", () => {
    expect(meta).toContainEqual({ property: "og:image", content: `${SITE_URL}/images/og/default.png` });
    expect(meta).toContainEqual({ property: "og:locale", content: "es_ES" });
    expect(meta).toContainEqual({ "script:ld+json": { "@type": "VideoGame" } });
  });
});

describe("buildMeta for articles", () => {
  const meta = buildMeta({
    locale: "en",
    path: "/blog/serverless",
    title: "Serverless",
    siteName: "André Patrinicola",
    description: "About serverless.",
    type: "article",
    alternates: { pt: "/blog/sem-servidor", en: "/blog/serverless" },
    article: { publishedTime: "2026-10-10T12:00:00.000Z", modifiedTime: "2026-10-12T12:00:00.000Z", tags: ["aws"] },
    feeds: [{ title: "Blog", href: "/en/blog/rss.xml" }],
  });

  it("lists only the languages the article exists in, with the Portuguese one as x-default", () => {
    const alternates = meta.filter((item) => "hrefLang" in item);
    expect(alternates.map((item) => ("hrefLang" in item ? [item.hrefLang, item.href] : []))).toEqual([
      ["pt-BR", `${SITE_URL}/pt/blog/sem-servidor`],
      ["en", `${SITE_URL}/en/blog/serverless`],
      ["x-default", `${SITE_URL}/pt/blog/sem-servidor`],
    ]);
    expect(meta).toContainEqual({ property: "og:locale:alternate", content: "pt_BR" });
    expect(meta).not.toContainEqual({ property: "og:locale:alternate", content: "es_ES" });
  });

  it("describes the article for Open Graph and links the feed", () => {
    expect(meta).toContainEqual({ property: "og:type", content: "article" });
    expect(meta).toContainEqual({ property: "article:published_time", content: "2026-10-10T12:00:00.000Z" });
    expect(meta).toContainEqual({ property: "article:tag", content: "aws" });
    expect(meta).toContainEqual({
      tagName: "link",
      rel: "alternate",
      type: "application/rss+xml",
      title: "Blog",
      href: `${SITE_URL}/en/blog/rss.xml`,
    });
  });

  it("uses an explicit canonical URL for content first published elsewhere", () => {
    const moved = buildMeta({
      locale: "en",
      path: "/blog/x",
      siteName: "S",
      description: "D",
      canonicalUrl: "https://dev.to/andre/x",
      alternates: { en: "/blog/x" },
    });
    expect(moved).toContainEqual({ tagName: "link", rel: "canonical", href: "https://dev.to/andre/x" });
    expect(moved).toContainEqual({ property: "og:url", content: "https://dev.to/andre/x" });
    // Without a Portuguese version there is no x-default.
    expect(moved.some((item) => "hrefLang" in item && item.hrefLang === "x-default")).toBe(false);
  });
});
