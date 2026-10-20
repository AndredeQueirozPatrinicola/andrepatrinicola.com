import { localeInfo, locales } from "../i18n/config";
import { localePath } from "../i18n/paths";
import { localizedPaths } from "../routing/prerender";
import { absoluteUrl } from "../seo/site";

/** /sitemap.xml: every localized page, with its alternates in the other languages. */
export function loader() {
  const urls = localizedPaths().flatMap((path) =>
    locales.map((locale) => {
      const alternates = locales
        .map(
          (alternate) =>
            `    <xhtml:link rel="alternate" hreflang="${localeInfo[alternate].tag}" href="${absoluteUrl(localePath(alternate, path))}"/>`,
        )
        .join("\n");
      return `  <url>\n    <loc>${absoluteUrl(localePath(locale, path))}</loc>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl("/")}"/>\n  </url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
