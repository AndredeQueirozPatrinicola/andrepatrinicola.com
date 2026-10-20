import { Link } from "react-router";

type NotFoundViewProps = {
  title: string;
  body: string;
  backLabel: string;
  backHref: string;
};

export function NotFoundView({ title, body, backLabel, backHref }: NotFoundViewProps) {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title">{title}</h1>
      <p>{body}</p>
      <Link to={backHref}>{backLabel}</Link>
    </section>
  );
}
