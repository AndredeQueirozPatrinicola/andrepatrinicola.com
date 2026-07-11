import type { ReactNode } from "react";
import './content-container.css'

type ContentContainerProps = {
  id: string;
  children?: ReactNode
};


export function ContentContainer ({id, children}: ContentContainerProps) {
    return (
        <section className="content-container">
            {children}
        </section>
    )
}