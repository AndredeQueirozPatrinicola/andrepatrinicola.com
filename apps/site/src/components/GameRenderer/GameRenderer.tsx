import { useEffect, useRef } from 'react';
import './game-renderer.css'

export type GameRendererProps = {
    id: string,
    src: string,
    title: string,
}

export function GameRenderer({
    id, 
    src,
    title,    
}: GameRendererProps) {
    const ref = useRef<HTMLIFrameElement>(null);

    useEffect(() =>{
        if (ref.current) {
            ref.current.focus();
        }
    }, [])    

    return (
        <iframe
            ref={ref}
            id={id}
            src={src}
            title={title}
            allow={'fullscreen'}
            sandbox={'allow-scripts allow-same-origin allow-pointer-lock'}
            className='game-renderer-iframe'
        />
    );
}