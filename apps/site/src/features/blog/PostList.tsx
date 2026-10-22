import { useState } from "react";
import { Link } from "react-router";

import type { BlogPostSummary, ContentType } from "../../domain/blog";
import { useI18n } from "../../i18n/context";
import { format } from "../../i18n/format";
import { localePath } from "../../i18n/paths";

import "./blog.css";

type Filter = "all" | ContentType;

/** Every post, newest first, with a client-side filter by type when both exist. */
export function PostList({ posts }: { posts: BlogPostSummary[] }) {
  const { locale, messages } = useI18n();
  const text = messages.blog;
  const [filter, setFilter] = useState<Filter>("all");

  const types = [...new Set(posts.map((post) => post.type))];
  const visible = filter === "all" ? posts : posts.filter((post) => post.type === filter);
  const options: Filter[] = ["all", ...types];

  if (!posts.length) return <p className="blog-empty">{text.empty}</p>;

  return (
    <div className="blog-list">
      {types.length > 1 && (
        <div className="blog-filter" role="group" aria-label={text.filterLabel}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option === "all" ? text.all : text.typesPlural[option]}
            </button>
          ))}
        </div>
      )}

      <ol className="blog-posts">
        {visible.map((post) => (
          <li key={post.id}>
            <article className="blog-card" aria-labelledby={`post-${post.id}`}>
              <p className="blog-card-meta label">
                <span data-type={post.type}>{text.types[post.type]}</span>
                <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
                <span>{format(text.readingTime, { minutes: post.readingMinutes })}</span>
              </p>
              <h2 id={`post-${post.id}`} className="blog-card-title">
                <Link to={localePath(locale, `/blog/${post.slug}`)}>{post.title}</Link>
              </h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              {post.tags.length > 0 && (
                <ul className="tag-list" aria-label={text.tags}>
                  {post.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
