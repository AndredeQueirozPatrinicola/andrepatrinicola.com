import type { BlogPost } from "../domain/blog";
import type { Game } from "../domain/game";
import type { Profile } from "../domain/profile";
import { localeInfo, type Locale } from "../i18n/config";
import { localePath } from "../i18n/paths";
import { absoluteUrl } from "./site";

export function personSchema(profile: Profile, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    url: absoluteUrl(localePath(locale)),
    email: `mailto:${profile.email}`,
    address: { "@type": "PostalAddress", addressLocality: "São Paulo", addressCountry: "BR" },
    sameAs: profile.links.filter((link) => link.kind !== "email").map((link) => link.href),
  };
}

export function videoGameSchema(game: Game, profile: Profile, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.tagline,
    url: absoluteUrl(localePath(locale, `/games/${game.slug}`)),
    image: absoluteUrl(game.cover),
    inLanguage: game.language,
    gamePlatform: "Web browser",
    playMode: "SinglePlayer",
    applicationCategory: "Game",
    operatingSystem: "Any",
    dateCreated: String(game.year),
    author: { "@type": "Person", name: profile.name },
    ...(game.sourceUrl ? { codeRepository: game.sourceUrl } : {}),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function blogPostingSchema(post: BlogPost, profile: Profile, url: string, section: string) {
  const author = { "@type": "Person", name: profile.name, url: absoluteUrl(localePath(post.locale)) };
  const images = [post.ogImage, post.cover].flatMap((image) => (image ? [absoluteUrl(image.src)] : []));
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: localeInfo[post.locale].tag,
    articleSection: section,
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    ...(images.length ? { image: [...new Set(images)] } : {}),
    author,
    publisher: author,
  };
}
