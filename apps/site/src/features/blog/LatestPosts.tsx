import { Link } from "react-router";

import type { BlogPostSummary } from "../../domain/blog";
import { useI18n } from "../../i18n/context";
import { format } from "../../i18n/format";
import { localePath } from "../../i18n/paths";

import "./latest-posts.css";

/** The newest posts as cards (home page): cover, type, date, title and excerpt. */
export function LatestPosts({ posts }: { posts: BlogPostSummary[] }) {
  const { locale, messages } = useI18n();
  const text = messages.blog;

  return (
    <ol className="latest-posts">
      {posts.map((post) => (
        <li key={post.id}>
          <article className="post-card" aria-labelledby={`latest-${post.id}`}>
            <div className="post-card-cover" aria-hidden="true">
              {post.cover ? (
                <img
                  src={post.cover.src}
                  srcSet={post.cover.srcSet || undefined}
                  sizes="(min-width: 64rem) 24rem, (min-width: 40rem) 50vw, 100vw"
                  width={post.cover.width}
                  height={post.cover.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="post-card-placeholder">{text.types[post.type]}</span>
              )}
            </div>
            <div className="post-card-body">
              <p className="post-card-meta label">
                <span data-type={post.type}>{text.types[post.type]}</span>
                <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
                <span>{format(text.readingTime, { minutes: post.readingMinutes })}</span>
              </p>
              <h3 id={`latest-${post.id}`} className="post-card-title">
                <Link to={localePath(locale, `/blog/${post.slug}`)}>{post.title}</Link>
              </h3>
              <p className="post-card-excerpt">{post.excerpt}</p>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
