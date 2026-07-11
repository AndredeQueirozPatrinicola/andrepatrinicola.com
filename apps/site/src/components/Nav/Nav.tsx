import type { ReactNode } from "react";
import './nav.css'

type NavProps = {
  id: string;
  children: ReactNode
};

export function Nav({ id, children }: NavProps) {
  return (
    <section className="nav" id={id}>
      {children}
    </section>
  );
}
