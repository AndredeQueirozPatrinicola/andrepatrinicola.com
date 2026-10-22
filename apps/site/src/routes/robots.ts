import { absoluteUrl } from "../seo/site";

/**
 * /robots.txt: everything is public; the games' standalone builds and the
 * private admin (which is also noindex) are left out of search.
 */
export function loader() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /play/", "Disallow: /admin", "", `Sitemap: ${absoluteUrl("/sitemap.xml")}`, ""].join(
    "\n",
  );
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
