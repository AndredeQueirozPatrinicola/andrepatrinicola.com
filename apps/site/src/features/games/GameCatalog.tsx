import type { Game } from "../../domain/game";
import { GameCard, type GameCardVariant } from "./GameCard";

import "./game-catalog.css";

/** First game large, the next two side by side with it, the rest in pairs. */
function variantFor(index: number): GameCardVariant {
  if (index === 0) return "featured";
  if (index <= 2) return "compact";
  return "standard";
}

export function GameCatalog({ games }: { games: Game[] }) {
  return (
    <ul className="game-catalog">
      {games.map((game, index) => (
        <li key={game.slug} className={`game-catalog-item game-catalog-item-${variantFor(index)}`}>
          <GameCard game={game} variant={variantFor(index)} />
        </li>
      ))}
    </ul>
  );
}
