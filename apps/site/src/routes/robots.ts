import { absoluteUrl } from "../seo/site";

/** /robots.txt: everything is public; the games' standalone builds are left out of search. */
export function loader() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /play/", "", `Sitemap: ${absoluteUrl("/sitemap.xml")}`, ""].join(
    "\n",
  );
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
