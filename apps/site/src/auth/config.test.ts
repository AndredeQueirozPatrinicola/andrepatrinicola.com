import { describe, expect, it } from "vitest";

import { readStudioConfig, safeReturnTo } from "./config";

describe("readStudioConfig", () => {
  const env = {
    VITE_STUDIO_API_URL: "https://api.example.com/",
    VITE_COGNITO_AUTHORITY: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_X/",
    VITE_COGNITO_CLIENT_ID: "client",
    VITE_COGNITO_DOMAIN: "https://studio.auth.us-east-1.amazoncognito.com/",
  };

  it("reads the build variables and trims trailing slashes", () => {
    expect(readStudioConfig(env)).toEqual({
      apiUrl: "https://api.example.com",
      authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_X",
      clientId: "client",
      domain: "https://studio.auth.us-east-1.amazoncognito.com",
      scope: "openid email profile portfolio-studio/admin",
    });
  });

  it("is off when anything is missing", () => {
    expect(readStudioConfig({ ...env, VITE_COGNITO_CLIENT_ID: "" })).toBeNull();
    expect(readStudioConfig({})).toBeNull();
  });

  it("uses the API's local server and a simulated login only on the dev server in studio-local mode", () => {
    expect(readStudioConfig({ DEV: true, MODE: "studio-local" })).toMatchObject({ apiUrl: "http://localhost:3001", local: true });
    expect(readStudioConfig({ DEV: true, MODE: "studio-local", VITE_STUDIO_API_URL: "http://localhost:4000/" })?.apiUrl).toBe(
      "http://localhost:4000",
    );
    // A build is never local, even with the same mode.
    expect(readStudioConfig({ DEV: false, MODE: "studio-local" })).toBeNull();
    expect(readStudioConfig({ ...env, DEV: false, MODE: "studio-local" })?.local).toBeUndefined();
    expect(readStudioConfig({ DEV: true, MODE: "development" })).toBeNull();
  });
});

describe("safeReturnTo", () => {
  it.each([
    ["/admin/articles?status=draft", "/admin/articles?status=draft"],
    ["/admin", "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["//evil.example/admin", "/admin"],
    ["/admin\\@evil.example", "/admin"],
    ["/pt", "/admin"],
    ["/admin/callback?code=x", "/admin"],
    [undefined, "/admin"],
    [42, "/admin"],
  ])("%s → %s", (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});
