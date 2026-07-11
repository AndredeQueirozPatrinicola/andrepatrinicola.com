import React, { useEffect, useState } from "react";
import './loader.css';

type LoaderProps = {
    id: string;
    pixelNumber: number;
};

export function Loader({ id, pixelNumber = 3 }: LoaderProps) {
    const [activePixel, setActivePixel] = useState(0);
    
    const [pixels] = useState(() => Array.from({ length: pixelNumber }));

    useEffect(() => {
        const intervalId = setInterval(() => {
            setActivePixel((prevActivePixel) => {
                if (prevActivePixel < pixels.length - 1) {
                    return prevActivePixel + 1;
                } else {
                    return 0;
                }
            });
        }, 150);

        return () => clearInterval(intervalId);
    }, [pixels.length]);

    return (
        <div id={id} className="loader-container">
            {pixels.map((_, index) => {
                return (
                    <span 
                        key={index}
                        className={`loader-pixel ${index === activePixel ? 'selected' : ''}`}
                    />
                );
            })}
        </div>
    );
}