/**
 * Chooses a language: an explicit stored choice wins, then the browser's
 * preferred languages, then the fallback. Self-contained on purpose: `/`
 * inlines this exact function (via toString) in a script that runs before
 * React loads, so tests and production share one implementation.
 */
export function pickLocale(
  supported: readonly string[],
  fallback: string,
  preferred: readonly string[],
  stored: string | null | undefined,
): string {
  if (stored && supported.indexOf(stored) >= 0) return stored;
  for (let i = 0; i < preferred.length; i += 1) {
    const language = String(preferred[i]).toLowerCase().split("-")[0];
    if (supported.indexOf(language) >= 0) return language;
  }
  return fallback;
}
