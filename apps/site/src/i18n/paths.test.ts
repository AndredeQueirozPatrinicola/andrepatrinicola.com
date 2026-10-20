import { describe, expect, it } from "vitest";

import { detectLocale, localePath, switchLocalePath } from "./paths";

describe("localePath", () => {
  it("prefixes paths with the locale", () => {
    expect(localePath("en")).toBe("/en");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("es", "/games/pong")).toBe("/es/games/pong");
  });
});

describe("switchLocalePath", () => {
  it("keeps the rest of the path", () => {
    expect(switchLocalePath("/pt/games/pong", "en")).toBe("/en/games/pong");
    expect(switchLocalePath("/en", "es")).toBe("/es");
    expect(switchLocalePath("/pt/", "en")).toBe("/en");
  });

  it("adds a locale to paths without one", () => {
    expect(switchLocalePath("/", "es")).toBe("/es");
    expect(switchLocalePath("/games", "en")).toBe("/en/games");
  });
});

describe("detectLocale", () => {
  it("prefers an explicit stored choice", () => {
    expect(detectLocale(["en-US"], "es")).toBe("es");
  });

  it("falls back to the first supported browser language", () => {
    expect(detectLocale(["fr-FR", "es-MX", "en"], null)).toBe("es");
    expect(detectLocale(["pt-PT"], "invalid")).toBe("pt");
  });

  it("uses the default locale when nothing matches", () => {
    expect(detectLocale(["de-DE", "ja"])).toBe("pt");
    expect(detectLocale([])).toBe("pt");
  });
});
