import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/language-select.tsx"),
  route("404", "routes/not-found-page.tsx"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  // Build-time only: moved out of the deploy package (scripts/assemble-deploy.mjs).
  route("ai-knowledge.json", "routes/ai-knowledge.ts"),
  // Every child of :lang must be pre-rendered (its loader runs at build
  // time). Unknown URLs are answered by /404.html in production.
  route(":lang", "routes/locale-layout.tsx", [
    index("routes/home.tsx"),
    route("games", "routes/games.tsx"),
    route("games/:slug", "routes/game.tsx"),
    route("labs", "routes/labs.tsx"),
    route("labs/distributed-systems", "routes/lab-distributed-systems.tsx"),
    route("about", "routes/about.tsx"),
    route("resume", "routes/resume.tsx"),
    route("blog", "routes/blog.tsx"),
    route("blog/:slug", "routes/blog-post.tsx"),
  ]),
  route(":lang/blog/rss.xml", "routes/blog-rss.ts"),

  // Portfolio Studio: client-only pages, never pre-rendered or listed in the
  // sitemap. CloudFront serves the SPA shell (/admin/index.html) for them.
  route("admin/callback", "routes/admin/callback.tsx"),
  route("admin/signed-out", "routes/admin/signed-out.tsx"),
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/dashboard.tsx"),
    route("articles", "routes/admin/articles.tsx"),
    route("articles/new", "routes/admin/article-new.tsx"),
    route("articles/:id/edit", "routes/admin/article-edit.tsx"),
    route("media", "routes/admin/media.tsx"),
    route("publications", "routes/admin/publications.tsx"),
    route("publications/:id", "routes/admin/publication.tsx"),
    route("settings", "routes/admin/settings.tsx"),
  ]),
] satisfies RouteConfig;
