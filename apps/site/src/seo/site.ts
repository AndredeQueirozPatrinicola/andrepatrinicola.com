/**
 * Public origin of the site. Set VITE_SITE_URL at build time when a custom
 * domain is added; the CloudFront address keeps working either way, but
 * canonical URLs, Open Graph and the sitemap point to this origin.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://d1eq0mvu3moyxu.cloudfront.net").replace(
  /\/+$/,
  "",
);

export const DEFAULT_OG_IMAGE = "/images/og/default.png";

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}
