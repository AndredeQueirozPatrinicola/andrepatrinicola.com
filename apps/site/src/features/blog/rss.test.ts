import { describe, expect, it } from "vitest";

import type { BlogPostSummary } from "../../domain/blog";
import { buildRss, escapeXml } from "./rss";

const post = (overrides: Partial<BlogPostSummary> = {}): BlogPostSummary & { url: string } => ({
  id: "1",
  type: "article",
  locale: "en",
  slug: "a",
  title: "Tom & Jerry <script>",
  excerpt: "Quotes \" and ' and \u0007 bell",
  tags: ["aws"],
  publishedAt: "2026-10-10T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  publishedLabel: "",
  readingMinutes: 1,
  cover: null,
  url: "https://example.com/en/blog/a?x=1&y=2",
  ...overrides,
});

describe("escapeXml", () => {
  it("escapes markup and drops characters XML forbids", () => {
    expect(escapeXml(`<a href="x">&'</a>\u0000`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
  });
});

describe("buildRss", () => {
  const feed = {
    title: "Blog",
    description: "Posts",
    language: "en",
    link: "https://example.com/en/blog",
    self: "https://example.com/en/blog/rss.xml",
  };

  it("builds a valid RSS 2.0 channel", () => {
    const xml = buildRss({ ...feed, posts: [post()] });
    expect(xml).toContain('<atom:link href="https://example.com/en/blog/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain("<title>Tom &amp; Jerry &lt;script&gt;</title>");
    expect(xml).toContain("<link>https://example.com/en/blog/a?x=1&amp;y=2</link>");
    expect(xml).toContain("<pubDate>Sat, 10 Oct 2026 12:00:00 GMT</pubDate>");
    expect(xml).toContain("<lastBuildDate>Mon, 12 Oct 2026 12:00:00 GMT</lastBuildDate>");
    expect(xml).not.toContain("\u0007");
    expect(new DOMParser().parseFromString(xml, "application/xml").querySelector("parsererror")).toBeNull();
  });

  it("keeps the latest 50 posts", () => {
    const posts = Array.from({ length: 60 }, (_, index) => post({ id: String(index), slug: `p${index}` }));
    expect(buildRss({ ...feed, posts }).match(/<item>/g)).toHaveLength(50);
  });

  it("is valid without posts", () => {
    const xml = buildRss({ ...feed, posts: [] });
    expect(xml).not.toContain("<item>");
    expect(new DOMParser().parseFromString(xml, "application/xml").querySelector("parsererror")).toBeNull();
  });
});
