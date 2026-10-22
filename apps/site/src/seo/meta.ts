import type { MetaDescriptor } from "react-router";

import { localeInfo, locales, type Locale } from "../i18n/config";
import { localePath } from "../i18n/paths";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "./site";

type PageMeta = {
  locale: Locale;
  /** Path below the locale prefix ("" for the home page). */
  path: string;
  /** Page-specific title; the site name is appended. Omit for the home page. */
  title?: string;
  siteName: string;
  description: string;
  image?: { url: string; alt: string; width?: number; height?: number };
  type?: "website" | "profile" | "article";
  /** Structured data objects (schema.org), rendered as JSON-LD. */
  jsonLd?: object[];
  /**
   * Path of this page in each language it exists in (below the locale
   * prefix). Defaults to `path` in every language. Only these become hreflang
   * alternates, so a missing translation is never advertised.
   */
  alternates?: Partial<Record<Locale, string>>;
  /** Canonical URL when the content was first published elsewhere. */
  canonicalUrl?: string;
  /** Open Graph article properties (og:type "article"). */
  article?: { publishedTime: string; modifiedTime: string; tags: string[] };
  /** Feeds advertised with <link rel="alternate" type="application/rss+xml">. */
  feeds?: { title: string; href: string }[];
};

/**
 * Everything a page needs in <head> for search engines and link previews:
 * title, description, canonical URL, hreflang alternates, Open Graph, Twitter
 * card and JSON-LD. Computed in loaders, so it ends up in the pre-rendered
 * HTML that crawlers read.
 */
export function buildMeta({
  locale,
  path,
  title,
  siteName,
  description,
  image,
  type = "website",
  jsonLd = [],
  alternates,
  canonicalUrl,
  article,
  feeds = [],
}: PageMeta): MetaDescriptor[] {
  const fullTitle = title ? `${title} · ${siteName}` : siteName;
  const url = canonicalUrl ?? absoluteUrl(localePath(locale, path));
  const ogImage = image ?? { url: DEFAULT_OG_IMAGE, alt: siteName, width: 1200, height: 630 };
  const languages = alternates ?? Object.fromEntries(locales.map((alternate) => [alternate, path]));
  // A page in every language lets "/" pick one; otherwise the Portuguese version, if any.
  const xDefault = alternates ? (alternates.pt !== undefined ? absoluteUrl(localePath("pt", alternates.pt)) : undefined) : absoluteUrl("/");

  return [
    { title: fullTitle },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    ...locales
      .filter((alternate) => languages[alternate] !== undefined)
      .map((alternate) => ({
        tagName: "link",
        rel: "alternate",
        hrefLang: localeInfo[alternate].tag,
        href: absoluteUrl(localePath(alternate, languages[alternate])),
      })),
    ...(xDefault ? [{ tagName: "link", rel: "alternate", hrefLang: "x-default", href: xDefault }] : []),
    ...feeds.map((feed) => ({
      tagName: "link",
      rel: "alternate",
      type: "application/rss+xml",
      title: feed.title,
      href: absoluteUrl(feed.href),
    })),
    { property: "og:type", content: type },
    { property: "og:site_name", content: siteName },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: localeInfo[locale].ogLocale },
    ...locales
      .filter((alternate) => alternate !== locale && languages[alternate] !== undefined)
      .map((alternate) => ({ property: "og:locale:alternate", content: localeInfo[alternate].ogLocale })),
    ...(article
      ? [
          { property: "article:published_time", content: article.publishedTime },
          { property: "article:modified_time", content: article.modifiedTime },
          ...article.tags.map((tag) => ({ property: "article:tag", content: tag })),
        ]
      : []),
    { property: "og:image", content: absoluteUrl(ogImage.url) },
    { property: "og:image:alt", content: ogImage.alt },
    ...(ogImage.width && ogImage.height
      ? [
          { property: "og:image:width", content: String(ogImage.width) },
          { property: "og:image:height", content: String(ogImage.height) },
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: absoluteUrl(ogImage.url) },
    ...jsonLd.map((data) => ({ "script:ld+json": data })),
  ];
}
