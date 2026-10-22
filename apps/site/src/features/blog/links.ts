/**
 * Same rules as the API's whitelist: http(s), mailto, same-site paths and
 * in-page anchors. Re-checked while rendering, so a link that is not safe is
 * shown as plain text even if a snapshot somehow contained it.
 */
export function isSafeHref(href: string): boolean {
  if (href.length === 0 || href.length > 2048) return false;
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\s]/.test(href)) return false;
  if (href.startsWith("#")) return /^#[\w-]+$/.test(href);
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\");
  try {
    const url = new URL(href);
    if (url.protocol === "mailto:") return /^mailto:[^@\s]+@[^@\s]+$/.test(href);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href);
