export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export const THEME_STORAGE_KEY = "theme";

const CHANGE_EVENT = "themepreferencechange";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as readonly string[]).includes(value);
}

/**
 * Applies a preference to <html>. "system" removes `data-theme`, so CSS falls
 * back to `color-scheme: light dark` and follows the OS, live.
 */
export function applyThemePreference(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.themePreference = preference;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}

export function readThemePreference(root: HTMLElement = document.documentElement): ThemePreference {
  const value = root.dataset.themePreference;
  return isThemePreference(value) ? value : "system";
}

export function setThemePreference(preference: ThemePreference): void {
  applyThemePreference(preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Without storage the choice still applies to this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToThemePreference(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyThemePreference(isThemePreference(event.newValue) ? event.newValue : "system");
    onChange();
  };

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Inlined in <head> so the saved theme is applied before the first paint
 * (no flash of the wrong theme). Mirrors applyThemePreference.
 */
export const themeInitScript = `(function () {
  var preference = "system";
  try { preference = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system"; } catch (e) {}
  if (preference !== "light" && preference !== "dark") preference = "system";
  var root = document.documentElement;
  root.dataset.themePreference = preference;
  if (preference !== "system") root.dataset.theme = preference;
})();`;
