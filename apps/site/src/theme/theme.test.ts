import { beforeEach, describe, expect, it } from "vitest";

import {
  applyThemePreference,
  readThemePreference,
  setThemePreference,
  THEME_STORAGE_KEY,
  themeInitScript,
} from "./theme";

const root = document.documentElement;

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    delete root.dataset.theme;
    delete root.dataset.themePreference;
  });

  it("sets data-theme only for explicit choices", () => {
    applyThemePreference("dark");
    expect(root.dataset.theme).toBe("dark");

    applyThemePreference("system");
    expect(root.dataset.theme).toBeUndefined();
    expect(readThemePreference()).toBe("system");
  });

  it("persists the choice", () => {
    setThemePreference("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(readThemePreference()).toBe("light");
  });

  it("init script restores a saved theme and ignores invalid values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(themeInitScript)();
    expect(root.dataset.theme).toBe("dark");

    delete root.dataset.theme;
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    new Function(themeInitScript)();
    expect(root.dataset.theme).toBeUndefined();
    expect(root.dataset.themePreference).toBe("system");
  });
});
