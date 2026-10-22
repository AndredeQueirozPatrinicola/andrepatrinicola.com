import { useEffect } from "react";
import { data, Link, redirect } from "react-router";

import { track } from "../analytics/umami";
import { ShareButton } from "../components/ui/ShareButton";
import { repositories } from "../data";
import { ArticleContent } from "../features/blog/ArticleContent";
import { highlightDocument } from "../features/blog/highlight.server";
import { localeInfo, locales } from "../i18n/config";
import { useI18n } from "../i18n/context";
import { format } from "../i18n/format";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import { absoluteUrl } from "../seo/site";
import { blogPostingSchema, breadcrumbSchema } from "../seo/structured-data";
import type { Route } from "./+types/blog-post";

import "../features/blog/blog.css";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const post = await repositories.blog.findBySlug(params.slug, locale);
  if (!post) {
    // An older slug of a published article: permanent redirect (a meta refresh page when pre-rendered).
    const moved = await repositories.blog.findMovedSlug(params.slug, locale);
    if (moved) throw redirect(localePath(locale, `/blog/${moved}`), 301);
    throw data(null, { status: 404 });
  }

  const messages = getMessages(locale);
  const [all, profile] = await Promise.all([repositories.blog.list(locale), repositories.profile.get(locale)]);
  const index = all.findIndex((candidate) => candidate.id === post.id);
  const newer = all[index - 1];
  const older = all[index + 1];
  const path = `/blog/${post.slug}`;
  const pageUrl = absoluteUrl(localePath(locale, path));
  const typeLabel = messages.blog.types[post.type];

  const alternates = Object.fromEntries(Object.entries(post.alternates).map(([language, slug]) => [language, `/blog/${slug}`]));
  const localeLinks = Object.fromEntries(
    locales.map((language) => {
      const slug = post.alternates[language];
      return [language, localePath(language, slug ? `/blog/${slug}` : "/blog")];
    }),
  );
  const image = post.ogImage ?? post.cover;

  return {
    post: { ...post, content: highlightDocument(post.content) },
    newer: newer && { slug: newer.slug, title: newer.title },
    older: older && { slug: older.slug, title: older.title },
    localeLinks,
    shareUrl: pageUrl,
    meta: buildMeta({
      locale,
      path,
      title: post.seoTitle,
      siteName: messages.site.name,
      description: post.seoDescription,
      type: "article",
      alternates,
      ...(post.canonicalUrl ? { canonicalUrl: post.canonicalUrl } : {}),
      ...(image ? { image: { url: image.src, alt: image.alt || post.title, width: image.width, height: image.height } } : {}),
      article: { publishedTime: post.publishedAt, modifiedTime: post.updatedAt, tags: post.tags },
      feeds: [{ title: messages.blog.rssTitle, href: localePath(locale, "/blog/rss.xml") }],
      jsonLd: [
        blogPostingSchema(post, profile, post.canonicalUrl ?? pageUrl, typeLabel),
        breadcrumbSchema([
          { name: messages.blog.title, path: localePath(locale, "/blog") },
          { name: post.title, path: localePath(locale, path) },
        ]),
      ],
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function BlogPostRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { post, newer, older, shareUrl } = loaderData;
  const text = messages.blog;
  const translations = locales.filter((language) => language !== locale && post.alternates[language]);

  useEffect(() => {
    track("article-view", { article: post.id, locale, type: post.type });
  }, [post.id, post.type, locale]);

  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <article className="page blog-post">
      <nav className="breadcrumb" aria-label={text.breadcrumb}>
        <ol>
          <li>
            <Link to={localePath(locale, "/blog")}>{text.title}</Link>
          </li>
          <li aria-current="page">{post.title}</li>
        </ol>
      </nav>

      <header className="blog-post-header">
        <p className="label blog-post-type">{text.types[post.type]}</p>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="blog-post-lead">{post.excerpt}</p>}
        <ul className="blog-post-meta label">
          <li>
            <time dateTime={post.publishedAt}>{format(text.published, { date: post.publishedLabel })}</time>
          </li>
          {post.updatedLabel !== post.publishedLabel && (
            <li>
              <time dateTime={post.updatedAt}>{format(text.updated, { date: post.updatedLabel })}</time>
            </li>
          )}
          <li>{format(text.readingTime, { minutes: post.readingMinutes })}</li>
        </ul>
        {post.tags.length > 0 && (
          <ul className="tag-list" aria-label={text.tags}>
            {post.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </header>

      {post.cover && (
        <img
          className="blog-post-cover"
          src={post.cover.src}
          srcSet={post.cover.srcSet || undefined}
          sizes="(min-width: 64rem) 64rem, 100vw"
          width={post.cover.width}
          height={post.cover.height}
          alt={post.cover.alt}
          fetchPriority="high"
        />
      )}

      <ArticleContent
        content={post.content}
        images={post.images}
        onExternalLink={(href) => track("article-link", { domain: new URL(href).hostname })}
      />

      <footer className="blog-post-footer">
        <section aria-labelledby="share-title">
          <h2 id="share-title" className="label">
            {text.shareTitle}
          </h2>
          <div className="blog-post-share">
            <a href={linkedIn} rel="noopener noreferrer" onClick={() => track("article-share", { network: "linkedin" })}>
              {text.shareLinkedIn}
            </a>
            <ShareButton
              title={post.title}
              className="share-button"
              onShare={(method) => track("article-share", { network: method })}
            />
          </div>
        </section>

        {translations.length > 0 && (
          <section className="blog-post-languages" aria-labelledby="languages-title">
            <h2 id="languages-title" className="label">
              {text.otherLanguages}
            </h2>
            <ul>
              {translations.map((language) => (
                <li key={language}>
                  <Link
                    to={localePath(language, `/blog/${post.alternates[language]}`)}
                    hrefLang={localeInfo[language].tag}
                    lang={localeInfo[language].tag}
                  >
                    {localeInfo[language].nativeName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="blog-post-nav" aria-label={text.navigation}>
          <ul>
            {older && (
              <li>
                <Link to={localePath(locale, `/blog/${older.slug}`)} rel="prev" data-direction="older">
                  <span className="label">{text.previous}</span>
                  {older.title}
                </Link>
              </li>
            )}
            {newer && (
              <li>
                <Link to={localePath(locale, `/blog/${newer.slug}`)} rel="next" data-direction="newer">
                  <span className="label">{text.next}</span>
                  {newer.title}
                </Link>
              </li>
            )}
            <li>
              <Link to={localePath(locale, "/blog")}>
                <span className="label">{text.allPosts}</span>
                {text.title}
              </Link>
            </li>
          </ul>
        </nav>
      </footer>
    </article>
  );
}
