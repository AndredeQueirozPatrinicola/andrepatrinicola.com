import { data, Link } from "react-router";

import { repositories } from "../data";
import { ControlsLegend } from "../features/games/ControlsLegend";
import { GameCard } from "../features/games/GameCard";
import { GamePlayer } from "../features/games/GamePlayer";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/game";

import "../features/games/game-page.css";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const game = await repositories.games.findBySlug(params.slug, locale);
  if (!game) {
    throw data(null, { status: 404 });
  }

  const messages = getMessages(locale);
  const others = (await repositories.games.list(locale)).filter(
    (candidate) => candidate.slug !== game.slug,
  );

  return {
    game,
    others,
    meta: buildMeta({
      title: game.title,
      siteName: messages.site.name,
      description: `${game.tagline} ${game.goal}`,
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function GameRoute({ loaderData }: Route.ComponentProps) {
  const { locale, messages } = useI18n();
  const { game, others } = loaderData;
  const text = messages.games;

  return (
    <div className="page game-page">
      <nav className="breadcrumb" aria-label={text.breadcrumb}>
        <ol>
          <li>
            <Link to={localePath(locale, "/games")}>{text.title}</Link>
          </li>
          <li aria-current="page">{game.title}</li>
        </ol>
      </nav>

      <header className="game-header">
        <h1>{game.title}</h1>
        <p className="game-header-tagline">{game.tagline}</p>
        <ul className="game-header-meta">
          <li data-status={game.status}>{text.status[game.status]}</li>
          <li>{game.inputs.map((input) => text.inputs[input]).join(" + ")}</li>
          <li>{game.year}</li>
        </ul>
      </header>

      <div className="game-layout">
        <div className="game-layout-player">
          {/* Keyed so the player resets (and no iframe navigation is pushed to history) when moving between games. */}
          <GamePlayer key={game.slug} game={game} />
        </div>

        <aside className="game-guide" aria-labelledby="how-to-play">
          <h2 id="how-to-play" className="game-guide-title">
            {text.howToPlay}
          </h2>

          <section>
            <h3 className="label">{text.goal}</h3>
            <p className="game-goal">{game.goal}</p>
          </section>

          <section>
            <h3 className="label">{text.controls}</h3>
            <ControlsLegend controls={game.controls} />
          </section>

          <section>
            <h3 className="label">{text.rules}</h3>
            <ul className="game-list">
              {game.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          {game.notes.length > 0 && (
            <section className="game-notes">
              <h3 className="label">{text.beforePlaying}</h3>
              <ul className="game-list">
                {game.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <section className="game-details" aria-labelledby="game-internals">
        <div className="game-details-internals">
          <h2 id="game-internals" className="label">
            {text.internals}
          </h2>
          <ul className="game-list">
            {game.internals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <dl className="game-details-facts">
          <div>
            <dt className="label">{text.tech}</dt>
            <dd>
              <ul className="tag-list">
                {game.tech.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </dd>
          </div>
          {game.sourceUrl && (
            <div>
              <dt className="label">{text.source}</dt>
              <dd>
                <a href={game.sourceUrl} rel="noreferrer">
                  {game.sourceUrl.replace("https://", "")}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="game-others" aria-labelledby="other-games">
        <div className="game-others-head">
          <h2 id="other-games" className="label">
            {text.others}
          </h2>
          <Link to={localePath(locale, "/games")}>{text.all}</Link>
        </div>
        <ul className="game-others-list">
          {others.map((other) => (
            <li key={other.slug}>
              <GameCard game={other} headingLevel="h3" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
