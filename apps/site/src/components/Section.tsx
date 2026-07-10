import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function Section({ id, title, children }: SectionProps) {
  return (
    <section className="section" id={id}>
      <div className="section-heading">
        <span aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}
