/**
 * Diagrams saved in this browser (localStorage). One key per diagram, all
 * under one prefix; nothing leaves the device. Every read is validated like
 * an imported file, and every call reports storage failures (private mode,
 * full quota, blocked site data) instead of throwing.
 */
import type { ArchitectureDiagram } from "../model/types";
import { parseDiagram } from "../model/schema";
import { defaultStorage, DIAGRAM_PREFIX, LAST_KEY, readLast, type StorageLike } from "./last";


/** At ~100 KB per large diagram, this stays well below the usual 5 MB quota. */
export const MAX_SAVED_DIAGRAMS = 50;

export type StorageFailure = "unavailable" | "quota" | "limit";
export type SaveResult = { ok: true } | { ok: false; reason: StorageFailure };

export type LoadResult =
  | { ok: true; diagram: ArchitectureDiagram }
  | { ok: false; reason: "missing" | "corrupt" | "unavailable" | "incompatible" };

export type SavedEntry =
  | { id: string; status: "ok"; title: string; updatedAt: string; nodeCount: number }
  | { id: string; status: "corrupt" };

export type ListResult = { ok: true; entries: SavedEntry[] } | { ok: false; reason: "unavailable" };


function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
}

function diagramKeys(storage: StorageLike): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(DIAGRAM_PREFIX)) keys.push(key);
  }
  return keys;
}

export function createLibrary(getStorage: () => StorageLike | null = defaultStorage) {
  function storageOrNull(): StorageLike | null {
    try {
      return getStorage();
    } catch {
      return null;
    }
  }

  function withStorage<T>(fallback: T, run: (storage: StorageLike) => T): T {
    const storage = storageOrNull();
    if (!storage) return fallback;
    try {
      return run(storage);
    } catch {
      return fallback;
    }
  }

  function load(id: string): LoadResult {
    return withStorage<LoadResult>({ ok: false, reason: "unavailable" }, (storage) => {
      const raw = storage.getItem(DIAGRAM_PREFIX + id);
      if (raw === null) return { ok: false, reason: "missing" };
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        return { ok: false, reason: "corrupt" };
      }
      const parsed = parseDiagram(value);
      if (parsed.ok) return parsed.diagram.id === id ? parsed : { ok: false, reason: "corrupt" };
      return { ok: false, reason: parsed.error.code === "unsupported-version" ? "incompatible" : "corrupt" };
    });
  }

  function save(diagram: ArchitectureDiagram): SaveResult {
    const storage = storageOrNull();
    if (!storage) return { ok: false, reason: "unavailable" };
    try {
      const key = DIAGRAM_PREFIX + diagram.id;
      if (storage.getItem(key) === null && diagramKeys(storage).length >= MAX_SAVED_DIAGRAMS) {
        return { ok: false, reason: "limit" };
      }
      storage.setItem(key, JSON.stringify(diagram));
      storage.setItem(LAST_KEY, JSON.stringify({ id: diagram.id, title: diagram.title, updatedAt: diagram.updatedAt }));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
    }
  }

  function list(): ListResult {
    return withStorage<ListResult>({ ok: false, reason: "unavailable" }, (storage) => {
      const entries = diagramKeys(storage).map((key): SavedEntry => {
        const id = key.slice(DIAGRAM_PREFIX.length);
        const loaded = load(id);
        return loaded.ok
          ? { id, status: "ok", title: loaded.diagram.title, updatedAt: loaded.diagram.updatedAt, nodeCount: loaded.diagram.nodes.length }
          : { id, status: "corrupt" };
      });
      entries.sort((a, b) => (a.status === "ok" && b.status === "ok" ? b.updatedAt.localeCompare(a.updatedAt) : a.status === "ok" ? -1 : 1));
      return { ok: true, entries };
    });
  }

  function remove(id: string): boolean {
    return withStorage(false, (storage) => {
      storage.removeItem(DIAGRAM_PREFIX + id);
      if (readLast(storage)?.id === id) storage.removeItem(LAST_KEY);
      return true;
    });
  }

  function rename(id: string, title: string, now = new Date()): SaveResult | LoadResult {
    const loaded = load(id);
    if (!loaded.ok) return loaded;
    return save({ ...loaded.diagram, title, updatedAt: now.toISOString() });
  }

  /** Saves a copy under a new id; answers the copy's id. */
  function duplicate(id: string, copy: { id: string; title: string }, now = new Date()): { ok: true; id: string } | { ok: false } {
    const loaded = load(id);
    if (!loaded.ok) return { ok: false };
    const stamp = now.toISOString();
    const saved = save({ ...loaded.diagram, id: copy.id, title: copy.title, createdAt: stamp, updatedAt: stamp });
    return saved.ok ? { ok: true, id: copy.id } : { ok: false };
  }

  return { load, save, list, remove, rename, duplicate };
}

export type Library = ReturnType<typeof createLibrary>;
