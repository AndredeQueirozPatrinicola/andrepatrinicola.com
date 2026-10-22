/**
 * Portfolio Studio settings, public by nature (they end up in the bundle):
 * the API origin and the Cognito app client. The client is public (PKCE, no
 * secret); every admin request is authorized by the API, never here.
 */
export type StudioConfig = {
  apiUrl: string;
  authority: string;
  clientId: string;
  /** Cognito managed login domain, used for sign-out and token revocation. */
  domain: string;
  scope: string;
};

const trimSlash = (value: string) => value.replace(/\/+$/, "");

export function readStudioConfig(env: Partial<Record<string, string | undefined>> = import.meta.env): StudioConfig | null {
  const apiUrl = env.VITE_STUDIO_API_URL;
  const authority = env.VITE_COGNITO_AUTHORITY;
  const clientId = env.VITE_COGNITO_CLIENT_ID;
  const domain = env.VITE_COGNITO_DOMAIN;
  if (!apiUrl || !authority || !clientId || !domain) return null;
  return {
    apiUrl: trimSlash(apiUrl),
    authority: trimSlash(authority),
    clientId,
    domain: trimSlash(domain),
    scope: env.VITE_COGNITO_SCOPE || "openid email profile portfolio-studio/admin",
  };
}

export const studioConfig = readStudioConfig();

/** Where to go after signing in: only paths inside the admin are accepted. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value.startsWith("/admin/callback") || value.startsWith("/admin/signed-out")) return "/admin";
  return value;
}
