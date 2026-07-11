import React from "react";
import './no-content-placeholder.css'

type NoContentPlaceHolderProps = {
    id: string;
}


export function NoContentPlaceHolder ({id}: NoContentPlaceHolderProps) {
    return (
        <section id={id} className="no-content-placeholder">
            <span>Em Construção</span>
        </section>
    )
}