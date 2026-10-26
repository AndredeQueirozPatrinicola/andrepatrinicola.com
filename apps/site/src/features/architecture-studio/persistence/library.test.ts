import { describe, expect, it } from "vitest";

import type { ArchitectureDiagram } from "../model/types";
import { lastDiagram, type StorageLike } from "./last";
import { createLibrary, MAX_SAVED_DIAGRAMS } from "./library";

class MemoryStorage implements StorageLike {
  items = new Map<string, string>();
  quota = Number.POSITIVE_INFINITY;
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    const used = [...this.items.entries()].reduce((sum, [name, item]) => (name === key ? sum : sum + item.length), 0);
    if (used + value.length > this.quota) throw new DOMException("full", "QuotaExceededError");
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

const diagram = (id: string, title = "Diagram", updatedAt = "2026-10-26T12:00:00.000Z"): ArchitectureDiagram => ({
  schemaVersion: 1,
  id,
  title,
  createdAt: "2026-10-26T12:00:00.000Z",
  updatedAt,
  nodes: [{ id: "n1", serviceId: "aws-lambda", label: "Lambda", position: { x: 0, y: 0 } }],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

function setup() {
  const storage = new MemoryStorage();
  return { storage, library: createLibrary(() => storage) };
}

describe("local library", () => {
  it("saves, loads and lists diagrams, newest first", () => {
    const { library } = setup();
    expect(library.save(diagram("d-a", "Older", "2026-10-20T00:00:00.000Z"))).toEqual({ ok: true });
    expect(library.save(diagram("d-b", "Newer", "2026-10-25T00:00:00.000Z"))).toEqual({ ok: true });
    expect(library.load("d-a")).toEqual({ ok: true, diagram: diagram("d-a", "Older", "2026-10-20T00:00:00.000Z") });
    const list = library.list();
    expect(list.ok && list.entries.map((entry) => entry.id)).toEqual(["d-b", "d-a"]);
  });

  it("remembers the last saved diagram for the start screen", () => {
    const { storage, library } = setup();
    library.save(diagram("d-a", "First"));
    library.save(diagram("d-b", "Second"));
    expect(lastDiagram(() => storage)).toMatchObject({ id: "d-b", title: "Second" });
    library.remove("d-b");
    expect(lastDiagram(() => storage)).toBeNull();
  });

  it("renames and duplicates", () => {
    const { library } = setup();
    library.save(diagram("d-a", "Old name"));
    library.rename("d-a", "New name");
    expect(library.load("d-a")).toMatchObject({ ok: true, diagram: { title: "New name" } });
    expect(library.duplicate("d-a", { id: "d-copy", title: "Copy" })).toEqual({ ok: true, id: "d-copy" });
    expect(library.load("d-copy")).toMatchObject({ ok: true, diagram: { id: "d-copy", title: "Copy", nodes: [{ id: "n1" }] } });
  });

  it("deletes", () => {
    const { library } = setup();
    library.save(diagram("d-a"));
    expect(library.remove("d-a")).toBe(true);
    expect(library.load("d-a")).toEqual({ ok: false, reason: "missing" });
  });

  it("reports corrupted and incompatible records instead of throwing", () => {
    const { storage, library } = setup();
    storage.setItem("architecture-studio:v1:diagram:d-bad", "{not json");
    storage.setItem("architecture-studio:v1:diagram:d-evil", JSON.stringify({ ...diagram("d-evil"), nodes: [{ id: "x", serviceId: "<script>" }] }));
    storage.setItem("architecture-studio:v1:diagram:d-new", JSON.stringify({ ...diagram("d-new"), schemaVersion: 7 }));
    storage.setItem("architecture-studio:v1:diagram:d-moved", JSON.stringify(diagram("d-other")));
    expect(library.load("d-bad")).toEqual({ ok: false, reason: "corrupt" });
    expect(library.load("d-evil")).toEqual({ ok: false, reason: "corrupt" });
    expect(library.load("d-new")).toEqual({ ok: false, reason: "incompatible" });
    expect(library.load("d-moved")).toEqual({ ok: false, reason: "corrupt" });
    const list = library.list();
    expect(list.ok && list.entries.every((entry) => entry.status === "corrupt")).toBe(true);
  });

  it("reports a full quota", () => {
    const { storage, library } = setup();
    storage.quota = 100;
    expect(library.save(diagram("d-a"))).toEqual({ ok: false, reason: "quota" });
  });

  it("reports storage that is not available (private mode, blocked site data)", () => {
    const library = createLibrary(() => null);
    expect(library.save(diagram("d-a"))).toEqual({ ok: false, reason: "unavailable" });
    expect(library.load("d-a")).toEqual({ ok: false, reason: "unavailable" });
    expect(library.list()).toEqual({ ok: false, reason: "unavailable" });

    const throwing = createLibrary(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(throwing.save(diagram("d-a"))).toEqual({ ok: false, reason: "unavailable" });
    expect(lastDiagram(() => null)).toBeNull();
  });

  it("limits how many diagrams are kept", () => {
    const { library } = setup();
    for (let index = 0; index < MAX_SAVED_DIAGRAMS; index += 1) library.save(diagram(`d-${index}`));
    expect(library.save(diagram("d-one-more"))).toEqual({ ok: false, reason: "limit" });
    // Saving an existing diagram again is always allowed.
    expect(library.save(diagram("d-0", "Updated"))).toEqual({ ok: true });
  });

  it("ignores a forged last-diagram record", () => {
    const { storage } = setup();
    storage.setItem("architecture-studio:v1:last", JSON.stringify({ id: "../x", title: "t", updatedAt: "now" }));
    expect(lastDiagram(() => storage)).toBeNull();
  });
});
