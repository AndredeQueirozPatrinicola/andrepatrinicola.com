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
  type?: "website" | "profile";
  /** Structured data objects (schema.org), rendered as JSON-LD. */
  jsonLd?: object[];
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
}: PageMeta): MetaDescriptor[] {
  const fullTitle = title ? `${title} · ${siteName}` : siteName;
  const url = absoluteUrl(localePath(locale, path));
  const ogImage = image ?? { url: DEFAULT_OG_IMAGE, alt: siteName, width: 1200, height: 630 };

  return [
    { title: fullTitle },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    ...locales.map((alternate) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: localeInfo[alternate].tag,
      href: absoluteUrl(localePath(alternate, path)),
    })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/") },
    { property: "og:type", content: type },
    { property: "og:site_name", content: siteName },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: localeInfo[locale].ogLocale },
    ...locales
      .filter((alternate) => alternate !== locale)
      .map((alternate) => ({ property: "og:locale:alternate", content: localeInfo[alternate].ogLocale })),
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
