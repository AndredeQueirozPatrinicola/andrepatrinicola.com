import { Link } from "react-router";

type NotFoundViewProps = {
  /** Big status shown above the title; omitted for unknown errors. */
  code?: string;
  title: string;
  body: string;
  backLabel: string;
  backHref: string;
};

export function NotFoundView({ code = "404", title, body, backLabel, backHref }: NotFoundViewProps) {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      {code && (
        <p className="not-found-code" aria-hidden="true">
          {code}
        </p>
      )}
      <h1 id="not-found-title">{title}</h1>
      <p>{body}</p>
      <Link to={backHref}>{backLabel}</Link>
    </section>
  );
}
