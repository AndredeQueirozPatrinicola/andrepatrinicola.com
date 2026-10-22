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
  /** Local development against the API's local server, with a simulated login. */
  local?: true;
};

const trimSlash = (value: string) => value.replace(/\/+$/, "");

type Env = Partial<Record<string, string | boolean | undefined>>;

/** `react-router dev --mode studio-local` (npm run dev:studio). */
export const LOCAL_STUDIO_MODE = "studio-local";

/**
 * Local Studio: only on the dev server (DEV is false in every build, whatever
 * the mode), so a production bundle can never skip Cognito.
 */
export const isLocalStudio = (env: Env = import.meta.env) => env.DEV === true && env.MODE === LOCAL_STUDIO_MODE;

const text = (value: string | boolean | undefined) => (typeof value === "string" ? value : "");

export function readStudioConfig(env: Env = import.meta.env): StudioConfig | null {
  if (import.meta.env.DEV && isLocalStudio(env)) {
    return {
      apiUrl: trimSlash(text(env.VITE_STUDIO_API_URL) || "http://localhost:3001"),
      authority: "",
      clientId: "local",
      domain: "",
      scope: "",
      local: true,
    };
  }
  const apiUrl = text(env.VITE_STUDIO_API_URL);
  const authority = text(env.VITE_COGNITO_AUTHORITY);
  const clientId = text(env.VITE_COGNITO_CLIENT_ID);
  const domain = text(env.VITE_COGNITO_DOMAIN);
  if (!apiUrl || !authority || !clientId || !domain) return null;
  return {
    apiUrl: trimSlash(apiUrl),
    authority: trimSlash(authority),
    clientId,
    domain: trimSlash(domain),
    scope: text(env.VITE_COGNITO_SCOPE) || "openid email profile portfolio-studio/admin",
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
