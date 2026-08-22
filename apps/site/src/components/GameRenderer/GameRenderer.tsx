import { useEffect, useRef } from 'react';
import './game-renderer.css'

export type GameRendererProps = {
    id: string,
    gameUrl: string,
    devUrl?: string,
    title: string,
}

export function GameRenderer({
    id, 
    gameUrl,
    devUrl,
    title,    
}: GameRendererProps) {
    const ref = useRef<HTMLIFrameElement>(null);
    const game = import.meta.env.DEV && devUrl
        ? devUrl
        : gameUrl;

    useEffect(() =>{
        if (ref.current) {
            ref.current.focus();
        }
    }, [])    

    return (
        <iframe
            ref={ref}
            id={id}
            src={game}
            title={title}
            allow={'fullscreen'}
            sandbox={'allow-scripts allow-same-origin allow-pointer-lock'}
            className='game-renderer-iframe'
        />
    );
}
