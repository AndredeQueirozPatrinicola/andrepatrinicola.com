import type { UIMatch } from "react-router";

/**
 * Route `handle` for pages served as plain HTML, without loading or hydrating
 * React. Used by /404.html: CloudFront serves it at arbitrary URLs, where the
 * client router would not match the route it was rendered from.
 */
export const staticRouteHandle = { static: true } as const;

export function isStaticRoute(match: UIMatch): boolean {
  const handle = match.handle as Partial<typeof staticRouteHandle> | undefined;
  return handle?.static === true;
}
