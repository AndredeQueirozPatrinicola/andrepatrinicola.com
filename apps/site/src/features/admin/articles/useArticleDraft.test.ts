import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, type StudioApi } from "../api";
import type { Article } from "../types";
import { autosaveDelayMs, missingForReady, readBackup, slugify, useArticleDraft } from "./useArticleDraft";

const now = "2026-10-21T12:00:00.000Z";
const doc = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

function article(version = 1): Article {
  return {
    id: "a1",
    type: "article",
    status: "draft",
    tags: [],
    authorId: "x",
    createdAt: now,
    updatedAt: now,
    updatedBy: "andre",
    version,
    revisionCount: 0,
    pendingStale: false,
    locales: { pt: { locale: "pt", slug: "a", title: "A", excerpt: "", content: doc("x"), translationStatus: "draft", updatedAt: now } },
  };
}

function fakeApi(update: (patch: { version: number }) => Promise<unknown>) {
  return { articles: { update: vi.fn((_id: string, patch: { version: number }) => update(patch)), get: vi.fn(async () => article(5)) } } as unknown as StudioApi & {
    articles: { update: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("useArticleDraft", () => {
  it("saves once after the typing pauses, with the loaded version", async () => {
    const api = fakeApi(async (patch) => ({ article: { ...article(patch.version + 1) }, warnings: [] }));
    const { result } = renderHook(() => useArticleDraft(api, article()));

    act(() => result.current.updateLocale("pt", { title: "Ab" }));
    act(() => result.current.updateLocale("pt", { title: "Abc" }));
    expect(result.current.status).toBe("dirty");
    expect(api.articles.update).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(autosaveDelayMs);
    });
    expect(api.articles.update).toHaveBeenCalledTimes(1);
    expect(api.articles.update.mock.calls[0]![1]).toMatchObject({ version: 1, locales: { pt: { title: "Abc" } } });
    expect(result.current.status).toBe("saved");
    expect(result.current.version()).toBe(2);
  });

  it("keeps edits made during a save and saves them next", async () => {
    let resolve!: (value: unknown) => void;
    const api = fakeApi(() => new Promise((done) => (resolve = done)));
    const { result } = renderHook(() => useArticleDraft(api, article()));

    act(() => result.current.updateLocale("pt", { title: "First" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(autosaveDelayMs);
    });
    act(() => result.current.updateLocale("pt", { excerpt: "typed while saving" }));
    await act(async () => {
      resolve({ article: article(2), warnings: [] });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("dirty");
    expect(readBackup("a1")?.locales.pt?.excerpt).toBe("typed while saving");
  });

  it("stops on a version conflict and lets the user keep their changes", async () => {
    const api = fakeApi(async (patch) => {
      if (patch.version === 1) throw new ApiError(409, "version_conflict");
      return { article: article(patch.version + 1), warnings: [] };
    });
    const { result } = renderHook(() => useArticleDraft(api, article()));

    act(() => result.current.updateLocale("pt", { title: "Mine" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(autosaveDelayMs);
    });
    expect(result.current.status).toBe("conflict");
    expect(readBackup("a1")?.locales.pt?.title).toBe("Mine");

    // No automatic retry while in conflict.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(api.articles.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.resolveConflict("mine");
    });
    expect(api.articles.update.mock.calls[1]![1]).toMatchObject({ version: 5, locales: { pt: { title: "Mine" } } });
    expect(result.current.status).toBe("saved");
    expect(readBackup("a1")).toBeNull();
  });

  it("retries temporary failures with backoff", async () => {
    let calls = 0;
    const api = fakeApi(async (patch) => {
      calls += 1;
      if (calls === 1) throw new ApiError(503, "service_unavailable");
      return { article: article(patch.version + 1), warnings: [] };
    });
    const { result } = renderHook(() => useArticleDraft(api, article()));
    act(() => result.current.updateLocale("pt", { title: "Retry" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(autosaveDelayMs);
    });
    expect(result.current.status).toBe("error");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.status).toBe("saved");
  });
});

describe("helpers", () => {
  it("slugify", () => {
    expect(slugify("  Ação: Lambda + DynamoDB!  ")).toBe("acao-lambda-dynamodb");
  });

  it("missingForReady mirrors the API rule", () => {
    expect(missingForReady({ title: "", slug: "Bad Slug", excerpt: " ", content: { type: "doc", content: [{ type: "paragraph" }] } })).toEqual([
      "title",
      "slug",
      "excerpt",
      "content",
    ]);
    expect(missingForReady({ title: "T", slug: "t", excerpt: "E", content: doc("body") })).toEqual([]);
  });
});
