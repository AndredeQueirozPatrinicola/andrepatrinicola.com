import type { BlogPostSummary } from "../../domain/blog";

/** Escapes text for XML element content and attribute values. */
export function escapeXml(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex -- XML 1.0 forbids these characters
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Feed = {
  title: string;
  description: string;
  /** BCP 47 language tag. */
  language: string;
  /** Absolute URL of the blog index. */
  link: string;
  /** Absolute URL of the feed itself. */
  self: string;
  posts: (BlogPostSummary & { url: string })[];
};

/** RSS 2.0 with the latest 50 posts. Dates come from the posts, so builds are reproducible. */
export function buildRss({ title, description, language, link, self, posts }: Feed): string {
  const latest = posts.slice(0, 50);
  const lastBuild = latest.reduce<string | undefined>(
    (newest, post) => (!newest || post.updatedAt > newest ? post.updatedAt : newest),
    undefined,
  );

  const items = latest.map((post) =>
    [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(post.url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(post.url)}</guid>`,
      `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(post.excerpt)}</description>`,
      ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
      "    </item>",
    ].join("\n"),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(language)}</language>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>
${lastBuild ? `    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>\n` : ""}${items.join("\n")}${items.length ? "\n" : ""}  </channel>
</rss>
`;
}
