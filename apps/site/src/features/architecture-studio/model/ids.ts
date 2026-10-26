const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Random id like `n-k3x9q2m1`, unique among `taken` (ids match the schema's pattern). */
export function createId(prefix: string, taken?: ReadonlySet<string>): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const id = `${prefix}-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
    if (!taken?.has(id)) return id;
  }
}
