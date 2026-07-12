import './game-renderer.css'

export type GameRendererProps = {
    id: string,
    gameUrl: string,
    devUrl: string,
    title: string,
}

export function GameRenderer({
    id, 
    gameUrl,
    devUrl,
    title,    
}: GameRendererProps) {

    const game = import.meta.env.DEV
        ? devUrl
        : gameUrl;

    return (
        <iframe
            id={id}
            src={game}
            title={title}
            allow={'fullscreen'}
            sandbox={'allow-scripts allow-same-origin allow-pointer-lock'}
            className='game-renderer-iframe'
        />
    );
}