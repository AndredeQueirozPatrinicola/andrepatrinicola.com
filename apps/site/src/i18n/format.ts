/** Replaces `{name}` placeholders: format("{n} games", { n: 3 }) → "3 games". */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Two-digit counter, like a game HUD: 4 → "04". */
export function hudNumber(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * "2024-05" → "mai. de 2024" / "May 2024". Run where the page is rendered at
 * build time (loaders), so the browser never re-formats it differently.
 */
export function formatYearMonth(value: string, localeTag: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(localeTag, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
