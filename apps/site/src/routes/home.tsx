import { Link } from "react-router";

import { repositories } from "../data";
import { GameCatalog } from "../features/games/GameCatalog";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/home";

import "../features/home/home.css";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  const [games, profile] = await Promise.all([
    repositories.games.list(locale),
    repositories.profile.get(locale),
  ]);

  return {
    games: games.slice(0, 3),
    profile,
    meta: buildMeta({ siteName: messages.site.name, description: messages.site.description }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { games, profile } = loaderData;

  return (
    <div className="page">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="label">{profile.role}</p>
        <h1 id="home-title">{profile.name}</h1>
        <p className="home-hero-intro">{messages.home.intro}</p>
      </section>

      <section className="section-block" aria-labelledby="home-games">
        <div className="section-head">
          <h2 id="home-games" className="label">
            {messages.home.gamesTitle}
          </h2>
          <Link to={localePath(locale, "/games")}>{messages.home.allGames}</Link>
        </div>
        <GameCatalog games={games} />
      </section>
    </div>
  );
}
