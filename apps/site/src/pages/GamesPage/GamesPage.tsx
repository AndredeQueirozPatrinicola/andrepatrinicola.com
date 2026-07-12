import { MouseEvent, useState } from "react"
import { gamesCatalog } from "../../content/gamesCatelog"
import './games-page.css'
import { ReactNode } from "react"
import { GameRenderer } from "../GameRenderer/GameRenderer"

import defaultImage from '../../assets/images/defaultImage.png'

export type GamesPageProps = {
    onGameClicked: (event: MouseEvent, arg0: ReactNode) => void | undefined
}

export function GamesPage({onGameClicked}: GamesPageProps) {
    const [games, _] = useState(gamesCatalog)
    return (
        <div className="games-page">
            {games.map((game, index) => {
                if(game.status === 'published'){
                    return (
                        <a 
                            className="game-card"
                            id={game.slug} 
                            onClick={
                                (event) => onGameClicked(
                                    event, 
                                    <GameRenderer 
                                        id={game.slug + index} 
                                        title={game.title} 
                                        gameUrl={game.playUrl} 
                                        devUrl={game.devUrl}
                                    />
                                )}
                            >
                            <img  src={game.cover ? `src/assets/images/${game.cover}` : defaultImage}></img>
                            <span className="game-card-title">{game.title}</span>
                            <p className="game-card-description">{game.description}</p>
                        </a>
                    )
                }
            })}
        </div>
    )
}