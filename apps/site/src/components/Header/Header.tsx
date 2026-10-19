import type { ReactNode } from "react";

type HeaderProps = {
  id: string;
  title?: string;
  children?: ReactNode;
};

export function Header({ id, children }: HeaderProps) {
  return (
    <header>
        <section className="header" id={id}>
            <div className="header-content">{children || ''}</div>
        </section>
    </header>
  );
}
