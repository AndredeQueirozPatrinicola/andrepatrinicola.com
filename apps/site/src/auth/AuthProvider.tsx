import type { User, UserManager } from "oidc-client-ts";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { studioConfig, type StudioConfig } from "./config";
import { createUserManager, isUsable, logoutUrl } from "./oidc";

export type AuthStatus = "loading" | "signedIn" | "signedOut" | "expired" | "unconfigured";

export type AuthContextValue = {
  status: AuthStatus;
  email: string | null;
  /** Starts the managed login, coming back to `returnTo` (inside /admin). */
  signIn: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** A valid access token, renewed with the refresh token when needed. */
  getAccessToken: () => Promise<string | null>;
  /** Called by the API client on 401: the session is over. */
  markExpired: () => void;
  config: StudioConfig | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** Listeners that save unsaved work before the browser leaves for the login page. */
const beforeRedirect = new Set<() => void>();

export function onBeforeSignInRedirect(listener: () => void): () => void {
  beforeRedirect.add(listener);
  return () => beforeRedirect.delete(listener);
}

type ProviderProps = {
  children: ReactNode;
  /** Tests inject a fake; production builds one from the build-time config. */
  manager?: UserManager | null;
  config?: StudioConfig | null;
};

export function AuthProvider({ children, manager, config = studioConfig }: ProviderProps) {
  // import.meta.env.DEV is a constant false in builds: the local provider is not even bundled.
  if (import.meta.env.DEV && config?.local) return <LocalAuthProvider config={config}>{children}</LocalAuthProvider>;
  return (
    <CognitoAuthProvider manager={manager} config={config}>
      {children}
    </CognitoAuthProvider>
  );
}

/**
 * Local development (npm run dev:studio): always signed in as the local
 * admin. The API's local server accepts any bearer token; nothing here would
 * get past the real API.
 */
function LocalAuthProvider({ children, config }: { children: ReactNode; config: StudioConfig }) {
  const [status, setStatus] = useState<AuthStatus>("signedIn");

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      email: "admin@localhost",
      signIn: async () => setStatus("signedIn"),
      signOut: async () => window.location.assign("/admin/signed-out"),
      getAccessToken: async () => (status === "signedIn" ? "local-dev" : null),
      markExpired: () => setStatus((current) => (current === "signedIn" ? "expired" : current)),
      config,
    }),
    [status, config],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function CognitoAuthProvider({ children, manager: injected, config = studioConfig }: ProviderProps) {
  const managerRef = useRef<UserManager | null>(injected ?? null);
  const [status, setStatus] = useState<AuthStatus>(config ? "loading" : "unconfigured");
  const [user, setUser] = useState<User | null>(null);

  const manager = useCallback((): UserManager | null => {
    if (!config) return null;
    managerRef.current ??= createUserManager(config);
    return managerRef.current;
  }, [config]);

  useEffect(() => {
    const userManager = manager();
    if (!userManager) return;
    let active = true;

    const onLoaded = (loaded: User) => {
      if (!active) return;
      setUser(loaded);
      setStatus("signedIn");
    };
    const onExpired = () => {
      if (active) setStatus((current) => (current === "signedIn" ? "expired" : current));
    };
    const onRenewError = () => onExpired();

    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addAccessTokenExpired(onExpired);
    userManager.events.addSilentRenewError(onRenewError);

    (async () => {
      const stored = await userManager.getUser().catch(() => null);
      if (!active) return;
      if (stored && isUsable(stored)) {
        setUser(stored);
        setStatus("signedIn");
        return;
      }
      if (stored?.refresh_token) {
        const renewed = await userManager.signinSilent().catch(() => null);
        if (!active) return;
        if (renewed && isUsable(renewed)) {
          setUser(renewed);
          setStatus("signedIn");
          return;
        }
      }
      await userManager.removeUser().catch(() => undefined);
      if (active) setStatus("signedOut");
    })();

    return () => {
      active = false;
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeAccessTokenExpired(onExpired);
      userManager.events.removeSilentRenewError(onRenewError);
    };
  }, [manager]);

  const signIn = useCallback(
    async (returnTo = "/admin") => {
      const userManager = manager();
      if (!userManager) return;
      for (const listener of beforeRedirect) listener();
      await userManager.signinRedirect({ state: { returnTo } });
    },
    [manager],
  );

  const signOut = useCallback(async () => {
    const userManager = manager();
    if (!userManager || !config) return;
    await userManager.revokeTokens(["refresh_token"]).catch(() => undefined);
    await userManager.removeUser();
    window.location.assign(logoutUrl(config));
  }, [manager, config]);

  const getAccessToken = useCallback(async () => {
    const userManager = manager();
    if (!userManager) return null;
    const current = await userManager.getUser();
    if (current && isUsable(current) && (current.expires_in ?? 0) > 30) return current.access_token;
    if (current?.refresh_token) {
      const renewed = await userManager.signinSilent().catch(() => null);
      if (renewed && isUsable(renewed)) return renewed.access_token;
    }
    setStatus("expired");
    return null;
  }, [manager]);

  const markExpired = useCallback(() => setStatus((current) => (current === "signedIn" ? "expired" : current)), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      email: typeof user?.profile.email === "string" ? user.profile.email : null,
      signIn,
      signOut,
      getAccessToken,
      markExpired,
      config,
    }),
    [status, user, signIn, signOut, getAccessToken, markExpired, config],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** For the callback page: finishes the code exchange and returns where to go. */
export async function completeSignIn(config: StudioConfig | null = studioConfig): Promise<unknown> {
  if (!config) throw new Error("Portfolio Studio is not configured");
  const user = await createUserManager(config).signinRedirectCallback();
  return (user.state as { returnTo?: unknown } | undefined)?.returnTo;
}
