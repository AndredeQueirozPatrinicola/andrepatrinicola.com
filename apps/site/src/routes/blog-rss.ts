import { repositories } from "../data";
import { buildRss } from "../features/blog/rss";
import { localeInfo } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { absoluteUrl } from "../seo/site";
import type { Route } from "./+types/blog-rss";

/** /{lang}/blog/rss.xml: the latest posts in one language. */
export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const posts = await repositories.blog.list(locale);

  const xml = buildRss({
    title: messages.blog.rssTitle,
    description: messages.blog.intro,
    language: localeInfo[locale].tag,
    link: absoluteUrl(localePath(locale, "/blog")),
    self: absoluteUrl(localePath(locale, "/blog/rss.xml")),
    posts: posts.map((post) => ({ ...post, url: absoluteUrl(localePath(locale, `/blog/${post.slug}`)) })),
  });

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
