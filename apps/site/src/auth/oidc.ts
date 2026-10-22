import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

import type { StudioConfig } from "./config";

/**
 * oidc-client-ts does the protocol work (authorization code + PKCE, state,
 * token validation, refresh). Tokens are kept in sessionStorage: they live
 * only while the tab is open and never reach localStorage or cookies.
 * Cognito's discovery document lacks the logout and revocation endpoints,
 * so they are seeded from the managed login domain.
 */
export function createUserManager(config: StudioConfig): UserManager {
  const origin = window.location.origin;
  return new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: `${origin}/admin/callback`,
    post_logout_redirect_uri: `${origin}/admin/signed-out`,
    response_type: "code",
    scope: config.scope,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
    accessTokenExpiringNotificationTimeInSeconds: 120,
    // Renewal uses the refresh token; Cognito does not support iframe renewal.
    silentRequestTimeoutInSeconds: 10,
    revokeTokenTypes: ["refresh_token"],
    revokeTokensOnSignout: true,
    loadUserInfo: false,
    metadataSeed: {
      end_session_endpoint: `${config.domain}/logout`,
      revocation_endpoint: `${config.domain}/oauth2/revoke`,
    },
  });
}

/** Cognito's own logout URL: it ends the managed login session too. */
export function logoutUrl(config: StudioConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: `${window.location.origin}/admin/signed-out`,
  });
  return `${config.domain}/logout?${params.toString()}`;
}

/** Signed in with a token that has not expired (not a type guard: an expired user still has a refresh token). */
export function isUsable(user: User | null | undefined): boolean {
  return Boolean(user && !user.expired && user.access_token);
}
