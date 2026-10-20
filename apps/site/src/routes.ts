import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/language-select.tsx"),
  route("404", "routes/not-found-page.tsx"),
  // Every child of :lang must be pre-rendered (its loader runs at build
  // time). Unknown URLs are answered by /404.html in production.
  route(":lang", "routes/locale-layout.tsx", [
    index("routes/home.tsx"),
    route("games", "routes/games.tsx"),
    route("games/:slug", "routes/game.tsx"),
    route("labs", "routes/labs.tsx"),
    route("about", "routes/about.tsx"),
    route("resume", "routes/resume.tsx"),
  ]),
] satisfies RouteConfig;
