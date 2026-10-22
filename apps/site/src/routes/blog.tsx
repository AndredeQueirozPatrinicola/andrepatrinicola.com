import { HudStats } from "../components/ui/HudStats";
import { PageIntro } from "../components/ui/PageIntro";
import { repositories } from "../data";
import { PostList } from "../features/blog/PostList";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/blog";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  return {
    posts: await repositories.blog.list(locale),
    meta: buildMeta({
      locale,
      path: "/blog",
      title: messages.blog.title,
      siteName: messages.site.name,
      description: messages.blog.intro,
      feeds: [{ title: messages.blog.rssTitle, href: localePath(locale, "/blog/rss.xml") }],
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function BlogRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { posts } = loaderData;
  const text = messages.blog;

  return (
    <div className="page">
      <PageIntro
        title={text.title}
        lead={text.intro}
        aside={
          <>
            <HudStats stats={[{ label: text.count, value: posts.length }]} />
            {/* A feed is a file, not a page: a plain link, no client navigation. */}
            <a href={localePath(locale, "/blog/rss.xml")} type="application/rss+xml" className="blog-feed">
              {text.rss}
            </a>
          </>
        }
      />
      <section className="section-block" aria-label={text.title}>
        <PostList posts={posts} />
      </section>
    </div>
  );
}
