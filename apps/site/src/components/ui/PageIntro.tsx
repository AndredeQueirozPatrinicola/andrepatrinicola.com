import type { ReactNode } from "react";

import "./page-intro.css";

type PageIntroProps = {
  /** Small caption above the title (section name, breadcrumb). */
  eyebrow?: ReactNode;
  title: string;
  lead?: ReactNode;
  /** Right-hand column: stats, actions or metadata. */
  aside?: ReactNode;
};

export function PageIntro({ eyebrow, title, lead, aside }: PageIntroProps) {
  return (
    <header className="page-intro">
      <div className="page-intro-main">
        {eyebrow && <div className="page-intro-eyebrow">{eyebrow}</div>}
        <h1 className="page-intro-title">{title}</h1>
        {lead && <p className="page-intro-lead">{lead}</p>}
      </div>
      {aside && <div className="page-intro-aside">{aside}</div>}
    </header>
  );
}
