import type { MouseEvent} from "react";
import type { Game } from "../../domain/game"
import './games-page.css'
import type { ReactNode } from "react"
import { GameRenderer } from "../../components/GameRenderer/GameRenderer"

import defaultImage from '../../assets/images/defaultImage.png'

export type GamesPageProps = {
    games: Game[]
    onGameClicked: (event: MouseEvent, arg0: ReactNode) => void | undefined
}

export function GamesPage({games, onGameClicked}: GamesPageProps) {
    return (
        <div className="games-page">
            {games.map((game) => {
                const cover = game.cover ?? defaultImage
                if (game.hosting.kind === 'external') {
                    return (
                        <a key={game.slug} className="game-card" id={game.slug} href={game.hosting.url} target="_blank" rel="noreferrer">
                            <img src={cover} alt="" />
                            <span className="game-card-title">{game.title}</span>
                            <p className="game-card-description">{game.tagline}</p>
                        </a>
                    )
                }
                const src = game.hosting.path
                return (
                    <a
                        key={game.slug}
                        className="game-card"
                        id={game.slug}
                        onClick={(event) => onGameClicked(
                            event,
                            <GameRenderer id={game.slug} title={game.title} src={src} />
                        )}
                    >
                        <img src={cover} alt="" />
                        <span className="game-card-title">{game.title}</span>
                        <p className="game-card-description">{game.tagline}</p>
                    </a>
                )
            })}
        </div>
    )
}