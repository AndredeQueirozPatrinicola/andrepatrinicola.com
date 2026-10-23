import { Link } from "react-router";

import { repositories } from "../data";
import { LatestPosts } from "../features/blog/LatestPosts";
import { GameCatalog } from "../features/games/GameCatalog";
import { HomePlayfield, type Shortcut } from "../features/home/HomePlayfield";
import { useI18n } from "../i18n/context";
import { hudNumber } from "../i18n/format";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { primaryNavigation } from "../routing/navigation";
import { buildMeta } from "../seo/meta";
import { personSchema } from "../seo/structured-data";
import type { Route } from "./+types/home";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const [games, profile, posts] = await Promise.all([
    repositories.games.list(locale),
    repositories.profile.get(locale),
    repositories.blog.list(locale),
  ]);

  return {
    recentGames: games.slice(0, 3),
    latestPosts: posts.slice(0, 3),
    gameCount: games.length,
    profile,
    meta: buildMeta({
      locale,
      path: "",
      siteName: messages.site.name,
      description: messages.site.description,
      jsonLd: [personSchema(profile, locale)],
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { recentGames, gameCount, profile, latestPosts } = loaderData;

  const shortcuts: Shortcut[] = [
    ...primaryNavigation.map((item) => ({
      id: item.key,
      label: messages.nav[item.key],
      href: localePath(locale, item.path),
      detail: item.key === "games" ? hudNumber(gameCount) : undefined,
    })),
    ...profile.links
      .filter((link) => link.kind !== "email")
      .map((link) => ({ id: link.kind, label: link.label, href: link.href, external: true })),
  ];

  return (
    <>
      <HomePlayfield profile={profile} intro={messages.home.intro} shortcuts={shortcuts} />

      <div className="page">
        <section className="section-block" aria-labelledby="home-games">
          <div className="section-head">
            <h2 id="home-games" className="label">
              {messages.home.gamesTitle}
            </h2>
            <Link to={localePath(locale, "/games")}>{messages.home.allGames}</Link>
          </div>
          <GameCatalog games={recentGames} />
        </section>

        {latestPosts.length > 0 && (
          <section className="section-block" aria-labelledby="home-posts">
            <div className="section-head">
              <h2 id="home-posts" className="label">
                {messages.home.postsTitle}
              </h2>
              <Link to={localePath(locale, "/blog")}>{messages.home.allPosts}</Link>
            </div>
            <LatestPosts posts={latestPosts} />
          </section>
        )}
      </div>
    </>
  );
}
