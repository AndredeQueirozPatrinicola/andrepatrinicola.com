import type { Locale } from "../i18n/config";

/**
 * Article body: the structured document saved by Portfolio Studio (Tiptap /
 * ProseMirror JSON), already validated by the API. The site renders it with
 * its own components and still ignores anything outside this whitelist.
 * Contract: andrepatrinicola-api/docs/PORTFOLIO_STUDIO_ARCHITECTURE.md.
 */
export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "link"; attrs: { href: string } };

export type TextNode = { type: "text"; text: string; marks?: Mark[] };
export type InlineNode = TextNode | { type: "hardBreak" };

export type BlockNode =
  | { type: "paragraph"; content?: InlineNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 | 4 }; content?: InlineNode[] }
  | { type: "bulletList"; content: ListItemNode[] }
  | { type: "orderedList"; attrs: { start: number }; content: ListItemNode[] }
  | { type: "blockquote"; content: BlockNode[] }
  | { type: "codeBlock"; attrs: { language: string | null }; content?: TextNode[]; tokens?: CodeToken[] }
  | { type: "horizontalRule" }
  | { type: "image"; attrs: { mediaId: string; alt: string; caption: string } };

/**
 * Syntax-highlighted code, computed at build time (the highlighter never
 * reaches the browser): plain strings and spans with highlight.js classes.
 */
export type CodeToken = string | { className: string; children: CodeToken[] };

export type ListItemNode = { type: "listItem"; content: BlockNode[] };
export type ContentDoc = { type: "doc"; content: BlockNode[] };

export const contentTypes = ["article", "build_log"] as const;
export type ContentType = (typeof contentTypes)[number];

// ------------------------------------------------------------ snapshot (API → build)

export type SnapshotLocale = {
  locale: Locale;
  slug: string;
  previousSlugs: string[];
  title: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogMediaId?: string;
  content: ContentDoc;
};

export type SnapshotArticle = {
  id: string;
  type: ContentType;
  tags: string[];
  revision: number;
  publishedAt: string;
  updatedAt: string;
  coverMediaId: string | null;
  locales: SnapshotLocale[];
};

export type SnapshotMedia = {
  id: string;
  contentType: string;
  width: number;
  height: number;
  alt: Partial<Record<Locale, string>>;
  sha256: string;
  /** Present in the API response (temporary download URL); not used by the site. */
  url?: string;
};

export type ContentSnapshot = {
  schemaVersion: 1;
  deploymentId: string;
  sequence: number;
  generatedAt: string;
  articles: SnapshotArticle[];
  media: SnapshotMedia[];
};

// ------------------------------------------------------------ public images

/** Widths generated for each published image (never upscaled). */
export const imageWidths = [480, 960, 1200, 1600] as const;

export function widthsFor(originalWidth: number): number[] {
  const widths = imageWidths.filter((width) => width <= originalWidth);
  return widths.length ? [...widths] : [originalWidth];
}

/** Public path of a re-encoded image variant, generated at build time. */
export const mediaPath = (id: string, width: number) => `/media/${id}-${width}.webp`;

/**
 * Link previews (Open Graph, LinkedIn) get a JPEG, the format every crawler
 * reads, made for each article's cover and per-language preview image.
 */
export const shareImageWidth = 1200;
export const shareImagePath = (id: string) => `/media/${id}-share.jpg`;

/** Media used as a link preview: covers and per-language Open Graph images. */
export function shareImageIds(articles: Pick<SnapshotArticle, "coverMediaId" | "locales">[]): Set<string> {
  const ids = new Set<string>();
  for (const article of articles) {
    if (article.coverMediaId) ids.add(article.coverMediaId);
    for (const locale of article.locales) if (locale.ogMediaId) ids.add(locale.ogMediaId);
  }
  return ids;
}

export type ShareImage = { src: string; width: number; height: number; alt: string };

export type PublicImage = {
  id: string;
  width: number;
  height: number;
  alt: string;
  src: string;
  srcSet: string;
};

// ------------------------------------------------------------ what pages receive

export type BlogPostSummary = {
  id: string;
  type: ContentType;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  /** Pre-formatted at build time. */
  publishedLabel: string;
  readingMinutes: number;
  cover: PublicImage | null;
};

export type BlogPost = BlogPostSummary & {
  seoTitle: string;
  seoDescription: string;
  canonicalUrl?: string;
  /** Link preview (JPEG): the language's Open Graph image, or the cover. */
  ogImage: ShareImage | null;
  updatedLabel: string;
  content: ContentDoc;
  /** Images referenced by the body, by media id. */
  images: Record<string, PublicImage>;
  /** Slug of this article in each language it was published in. */
  alternates: Partial<Record<Locale, string>>;
};
