import { Link } from "react-router";

import type { Game } from "../../domain/game";
import { useI18n } from "../../i18n/context";
import { localePath } from "../../i18n/paths";

import "./game-card.css";

export type GameCardVariant = "featured" | "compact" | "standard";

type GameCardProps = {
  game: Game;
  variant?: GameCardVariant;
  headingLevel?: "h2" | "h3";
};

export function GameCard({ game, variant = "standard", headingLevel = "h2" }: GameCardProps) {
  const { locale, messages } = useI18n();
  const Heading = headingLevel;
  const text = messages.games;

  return (
    <article className={`game-card game-card-${variant}`}>
      <Link to={localePath(locale, `/games/${game.slug}`)} className="game-card-link">
        <div className="game-card-screen">
          <img
            src={game.cover}
            alt=""
            width={960}
            height={540}
            loading={variant === "featured" ? "eager" : "lazy"}
            decoding="async"
          />
          <span className="game-card-play" aria-hidden="true">
            {text.play}
          </span>
        </div>
        <div className="game-card-body">
          <Heading className="game-card-title">{game.title}</Heading>
          <p className="game-card-tagline">{game.tagline}</p>
          <ul className="game-card-meta">
            <li data-status={game.status}>{text.status[game.status]}</li>
            {game.hosting.kind === "external" && <li>{text.external}</li>}
            <li>{game.inputs.map((input) => text.inputs[input]).join(" + ")}</li>
            <li>{game.year}</li>
          </ul>
        </div>
      </Link>
    </article>
  );
}
