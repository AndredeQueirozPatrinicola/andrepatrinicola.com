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
