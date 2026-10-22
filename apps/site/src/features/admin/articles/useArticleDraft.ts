import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ContentDoc } from "../../../domain/blog";
import { locales, type Locale } from "../../../i18n/config";
import { ApiError, type ArticlePatch, type LocaleDraftInput, type StudioApi } from "../api";
import type { Article } from "../types";

export const autosaveDelayMs = 1500;
const retryDelaysMs = [2000, 5000, 10000];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

export type ArticleMetaDraft = { type: Article["type"]; tags: string[]; coverMediaId: string | null };

type Backup = {
  version: number;
  savedAt: string;
  meta?: ArticleMetaDraft;
  locales: Partial<Record<Locale, LocaleDraftInput>>;
};

export const emptyDoc = (): ContentDoc => ({ type: "doc", content: [] });

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
}

function hasBody(doc: ContentDoc | undefined): boolean {
  const walk = (nodes: unknown[] | undefined): boolean =>
    (nodes ?? []).some((node) => {
      const item = node as { type?: string; text?: string; content?: unknown[] };
      if (item.type === "image") return true;
      if (item.type === "text" && item.text?.trim()) return true;
      return Array.isArray(item.content) && walk(item.content);
    });
  return walk(doc?.content);
}

/** Same rule as the API: what a language needs before it can be marked ready. */
export function missingForReady(draft: Pick<LocaleDraftInput, "title" | "slug" | "excerpt" | "content">): string[] {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push("title");
  if (!draft.slug || !slugPattern.test(draft.slug)) missing.push("slug");
  if (!draft.excerpt.trim()) missing.push("excerpt");
  if (!hasBody(draft.content)) missing.push("content");
  return missing;
}

export const isValidSlug = (slug: string) => slugPattern.test(slug);

export function newLocaleDraft(): LocaleDraftInput {
  return { slug: "", title: "", excerpt: "", content: emptyDoc(), translationStatus: "draft" };
}

function toInput(article: Article): Partial<Record<Locale, LocaleDraftInput>> {
  const result: Partial<Record<Locale, LocaleDraftInput>> = {};
  for (const locale of locales) {
    const draft = article.locales[locale];
    if (!draft) continue;
    const { locale: _locale, updatedAt: _updatedAt, ...input } = draft;
    result[locale] = input;
  }
  return result;
}

const metaOf = (article: Article): ArticleMetaDraft => ({
  type: article.type,
  tags: article.tags,
  coverMediaId: article.coverMediaId ?? null,
});

const backupKey = (id: string) => `studio:unsaved:${id}`;

export function readBackup(id: string): Backup | null {
  try {
    const raw = window.sessionStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as Backup) : null;
  } catch {
    return null;
  }
}

function writeBackup(id: string, backup: Backup | null): void {
  try {
    if (backup) window.sessionStorage.setItem(backupKey(id), JSON.stringify(backup));
    else window.sessionStorage.removeItem(backupKey(id));
  } catch {
    // Storage full or unavailable: the in-memory draft still exists.
  }
}

/**
 * The editor's draft of one article: local edits, autosave with debounce and
 * optimistic locking, retries, conflict handling and a tab-local backup of
 * unsaved changes (used when the session expires or the tab reloads).
 */
export function useArticleDraft(api: StudioApi, initial: Article) {
  const [server, setServerState] = useState<Article>(initial);
  const [meta, setMetaState] = useState<ArticleMetaDraft>(() => metaOf(initial));
  const [drafts, setDrafts] = useState(() => toInput(initial));
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<{ locale: Locale; code: string; articleId: string }[]>([]);
  /** Changes whenever the content is replaced from outside the editor (editors remount). */
  const [revision, setRevision] = useState(0);

  // Refs mirror the state for the async save loop.
  const version = useRef(initial.version);
  const draftsRef = useRef(drafts);
  const metaRef = useRef(meta);
  const dirtyLocales = useRef(new Map<Locale, number>());
  const dirtyMeta = useRef(0);
  const generation = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);
  const attempt = useRef(0);
  const blocked = useRef(false);
  /** Lets the save loop schedule itself (retries, edits made while saving). */
  const saveRef = useRef<() => Promise<boolean>>(async () => true);

  const hasUnsaved = () => dirtyLocales.current.size > 0 || dirtyMeta.current > 0;

  const backupNow = useCallback(() => {
    if (!hasUnsaved()) return;
    const changed: Partial<Record<Locale, LocaleDraftInput>> = {};
    for (const locale of dirtyLocales.current.keys()) {
      const draft = draftsRef.current[locale];
      if (draft) changed[locale] = draft;
    }
    writeBackup(initial.id, {
      version: version.current,
      savedAt: new Date().toISOString(),
      ...(dirtyMeta.current ? { meta: metaRef.current } : {}),
      locales: changed,
    });
  }, [initial.id]);

  const save = useCallback(async (): Promise<boolean> => {
    if (inflight.current) {
      await inflight.current;
      if (!hasUnsaved()) return true;
    }
    if (!hasUnsaved()) return true;
    if (blocked.current) return false;
    window.clearTimeout(timer.current);

    const sentGeneration = generation.current;
    const sentLocales = [...dirtyLocales.current.keys()];
    const patch: ArticlePatch = {
      version: version.current,
      ...(dirtyMeta.current
        ? { article: { type: metaRef.current.type, tags: metaRef.current.tags, coverMediaId: metaRef.current.coverMediaId } }
        : {}),
      ...(sentLocales.length
        ? { locales: Object.fromEntries(sentLocales.map((locale) => [locale, draftsRef.current[locale]!])) }
        : {}),
    };

    setStatus("saving");
    const run = (async () => {
      try {
        const result = await api.articles.update(initial.id, patch);
        version.current = result.article.version;
        setServerState(result.article);
        setWarnings(result.warnings);
        for (const locale of sentLocales) {
          if ((dirtyLocales.current.get(locale) ?? 0) <= sentGeneration) dirtyLocales.current.delete(locale);
        }
        if (dirtyMeta.current <= sentGeneration) dirtyMeta.current = 0;
        attempt.current = 0;
        setError(null);
        setSavedAt(new Date().toISOString());
        if (hasUnsaved()) {
          setStatus("dirty");
          backupNow();
          timer.current = window.setTimeout(() => void saveRef.current(), autosaveDelayMs);
        } else {
          setStatus("saved");
          writeBackup(initial.id, null);
        }
        return true;
      } catch (reason) {
        const failure = reason instanceof ApiError ? reason : new ApiError(0, "network_error");
        setError(failure);
        backupNow();
        if (failure.code === "version_conflict") {
          blocked.current = true;
          setStatus("conflict");
        } else {
          setStatus("error");
          const retryable = failure.status === 0 || failure.status === 429 || failure.status >= 500;
          if (retryable && attempt.current < retryDelaysMs.length) {
            const delay = retryDelaysMs[attempt.current++]!;
            timer.current = window.setTimeout(() => void saveRef.current(), delay);
          }
        }
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [api, initial.id, backupNow]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const markDirty = useCallback(
    (locale?: Locale) => {
      generation.current += 1;
      if (locale) dirtyLocales.current.set(locale, generation.current);
      else dirtyMeta.current = generation.current;
      attempt.current = 0;
      setStatus((current) => (current === "conflict" ? current : "dirty"));
      window.clearTimeout(timer.current);
      if (!blocked.current) timer.current = window.setTimeout(() => void save(), autosaveDelayMs);
    },
    [save],
  );

  const updateLocale = useCallback(
    (locale: Locale, change: Partial<LocaleDraftInput>) => {
      setDrafts((current) => {
        const next = { ...current, [locale]: { ...(current[locale] ?? newLocaleDraft()), ...change } };
        draftsRef.current = next;
        return next;
      });
      markDirty(locale);
    },
    [markDirty],
  );

  const updateMeta = useCallback(
    (change: Partial<ArticleMetaDraft>) => {
      setMetaState((current) => {
        const next = { ...current, ...change };
        metaRef.current = next;
        return next;
      });
      markDirty();
    },
    [markDirty],
  );

  /** Replaces everything with a server copy (after reload, restore or conflict resolution). */
  const reset = useCallback(
    (article: Article) => {
      window.clearTimeout(timer.current);
      dirtyLocales.current.clear();
      dirtyMeta.current = 0;
      blocked.current = false;
      attempt.current = 0;
      version.current = article.version;
      setServerState(article);
      const nextDrafts = toInput(article);
      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
      const nextMeta = metaOf(article);
      metaRef.current = nextMeta;
      setMetaState(nextMeta);
      setStatus("saved");
      setError(null);
      setRevision((value) => value + 1);
      writeBackup(initial.id, null);
    },
    [initial.id],
  );

  /** Publication state changes (status, live, pending) without touching the draft. */
  const setServer = useCallback((article: Article) => {
    setServerState(article);
    if (!hasUnsaved()) version.current = article.version;
  }, []);

  /** Conflict: keep mine (on top of the newest version) or take the server's. */
  const resolveConflict = useCallback(
    async (choice: "mine" | "theirs") => {
      const latest = await api.articles.get(initial.id);
      if (choice === "theirs") {
        reset(latest);
        return;
      }
      version.current = latest.version;
      setServerState(latest);
      blocked.current = false;
      await save();
    },
    [api, initial.id, reset, save],
  );

  /** Applies a backup found when the page loaded. */
  const restoreBackup = useCallback(
    (backup: Backup) => {
      for (const [locale, draft] of Object.entries(backup.locales) as [Locale, LocaleDraftInput][]) updateLocale(locale, draft);
      if (backup.meta) updateMeta(backup.meta);
      setRevision((value) => value + 1);
    },
    [updateLocale, updateMeta],
  );

  useEffect(() => {
    const onLeave = () => backupNow();
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.clearTimeout(timer.current);
    };
  }, [backupNow]);

  return useMemo(
    () => ({
      server,
      meta,
      drafts,
      status,
      error,
      savedAt,
      warnings,
      revision,
      version: () => version.current,
      hasUnsaved,
      updateLocale,
      updateMeta,
      save,
      reset,
      setServer,
      resolveConflict,
      restoreBackup,
      backupNow,
      discardBackup: () => writeBackup(initial.id, null),
    }),
    [server, meta, drafts, status, error, savedAt, warnings, revision, updateLocale, updateMeta, save, reset, setServer, resolveConflict, restoreBackup, backupNow, initial.id],
  );
}

export type ArticleDraft = ReturnType<typeof useArticleDraft>;
