import { repositories } from "../data";
import { localeInfo, locales, type Locale } from "../i18n/config";
import { localePath } from "../i18n/paths";
import { localizedPaths } from "../routing/prerender";
import { absoluteUrl } from "../seo/site";

type Url = {
  loc: string;
  /** hreflang → absolute URL, the page itself included. */
  alternates: [string, string][];
  lastmod?: string;
};

function render({ loc, alternates, lastmod }: Url): string {
  const links = alternates.map(
    ([hreflang, href]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
  );
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...links,
    "  </url>",
  ].join("\n");
}

/** /sitemap.xml: every localized page and every published article, with their alternates. */
export async function loader() {
  const pages: Url[] = localizedPaths().flatMap((path) =>
    locales.map((locale) => ({
      loc: absoluteUrl(localePath(locale, path)),
      alternates: [
        ...locales.map((alternate): [string, string] => [localeInfo[alternate].tag, absoluteUrl(localePath(alternate, path))]),
        ["x-default", absoluteUrl("/")] as [string, string],
      ],
    })),
  );

  // Articles list only the languages they were published in.
  const posts: Url[] = (await repositories.blog.entries()).map((entry) => {
    const translations = locales.filter((locale): locale is Locale => entry.translations[locale] !== undefined);
    const href = (locale: Locale) => absoluteUrl(localePath(locale, `/blog/${entry.translations[locale]}`));
    return {
      loc: href(entry.locale),
      lastmod: entry.updatedAt.slice(0, 10),
      alternates: [
        ...translations.map((locale): [string, string] => [localeInfo[locale].tag, href(locale)]),
        ...(entry.translations.pt ? [["x-default", href("pt")] as [string, string]] : []),
      ],
    };
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...pages, ...posts].map(render).join("\n")}
</urlset>
`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
