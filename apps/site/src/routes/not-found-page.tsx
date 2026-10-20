import { localeInfo, locales } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { localePath } from "../i18n/paths";
import { staticRouteHandle } from "../routing/static-route";
import type { Route } from "./+types/not-found-page";

/**
 * Rendered to /404.html, which CloudFront returns for any missing path. The
 * URL carries no language, so the page speaks all of them.
 */
export const handle = staticRouteHandle;

export function loader() {
  return {
    variants: locales.map((locale) => ({
      locale,
      tag: localeInfo[locale].tag,
      href: localePath(locale),
      ...getMessages(locale).notFound,
    })),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `404 · ${loaderData.variants.map((variant) => variant.title).join(" · ")}` },
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFoundPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className="not-found" aria-labelledby="not-found-title">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      {loaderData.variants.map((variant, index) => (
        <section key={variant.locale} lang={variant.tag}>
          <h1 id={index === 0 ? "not-found-title" : undefined}>{variant.title}</h1>
          <p>{variant.body}</p>
          <a href={variant.href}>{variant.back}</a>
        </section>
      ))}
    </main>
  );
}
