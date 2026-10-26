/**
 * Storage keys and the "last diagram" record. Kept apart from the library
 * (and its schema) so the start screen can offer "Continue" without loading
 * the editor's code.
 */
export const STORAGE_PREFIX = "architecture-studio:v1:";
export const DIAGRAM_PREFIX = `${STORAGE_PREFIX}diagram:`;
export const LAST_KEY = `${STORAGE_PREFIX}last`;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export type LastDiagram = { id: string; title: string; updatedAt: string };

export function readLast(storage: StorageLike): LastDiagram | null {
  const raw = storage.getItem(LAST_KEY);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null) return null;
  const { id, title, updatedAt } = value as Record<string, unknown>;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || typeof title !== "string" || typeof updatedAt !== "string") {
    return null;
  }
  if (storage.getItem(DIAGRAM_PREFIX + id) === null) return null;
  return { id, title: title.slice(0, 120), updatedAt };
}

/** The diagram edited last, for "Continue" on the start screen. */
export function lastDiagram(getStorage: () => StorageLike | null = defaultStorage): LastDiagram | null {
  try {
    const storage = getStorage();
    return storage ? readLast(storage) : null;
  } catch {
    return null;
  }
}
