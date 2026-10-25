import { useMemo } from "react";

import { useAuth } from "../../auth/AuthProvider";
import type { QueueLabOverview, QueueRun, RunScenario, StartedRun } from "../queue-lab/live/types";
import type { Locale } from "../../i18n/config";
import type {
  Article,
  ArticleListItem,
  ArticleStatus,
  Deployment,
  LinkedInStatus,
  LocaleDraft,
  Media,
  Page,
  Publication,
  RevisionDocument,
  RevisionSummary,
} from "./types";

/** An error answered by the API: `code` is the API's `error` field. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(typeof body.message === "string" ? body.message : code);
    this.name = "ApiError";
  }

  get fields(): string[] {
    return Array.isArray(this.body.fields) ? (this.body.fields as string[]) : [];
  }
}

type Transport = {
  apiUrl: string;
  getAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
  fetch?: typeof fetch;
};

export type LocaleDraftInput = Omit<LocaleDraft, "locale" | "updatedAt">;

export type ArticlePatch = {
  version: number;
  article?: { type?: Article["type"]; tags?: string[]; coverMediaId?: string | null };
  locales?: Partial<Record<Locale, LocaleDraftInput>>;
};

const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : "";
};

export function createStudioApi({ apiUrl, getAccessToken, onUnauthorized, fetch: fetchImpl = globalThis.fetch }: Transport) {
  async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const token = await getAccessToken();
    if (!token) {
      onUnauthorized();
      throw new ApiError(401, "unauthorized");
    }

    let response: Response;
    try {
      response = await fetchImpl(`${apiUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      throw new ApiError(0, "network_error", { message: "Sem conexão com a API." });
    }

    if (response.status === 401) {
      onUnauthorized();
      throw new ApiError(401, "unauthorized");
    }
    if (response.status === 204) return undefined as T;
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const code = typeof payload.error === "string" ? payload.error : response.status === 429 ? "rate_limited" : "http_error";
      throw new ApiError(response.status, code, payload);
    }
    return payload as T;
  }

  const id = encodeURIComponent;

  return {
    me: () => request<{ sub: string; username: string }>("GET", "/admin/me"),

    articles: {
      list: (params: { status?: ArticleStatus; type?: string; cursor?: string | null; limit?: number } = {}) =>
        request<Page<ArticleListItem>>("GET", `/admin/articles${query(params)}`),
      create: (input: { type: Article["type"]; title?: string; locale?: Locale }) => request<Article>("POST", "/admin/articles", input),
      get: (articleId: string, signal?: AbortSignal) => request<Article>("GET", `/admin/articles/${id(articleId)}`, undefined, signal),
      update: (articleId: string, patch: ArticlePatch) =>
        request<{ article: Article; warnings: { locale: Locale; code: string; articleId: string }[] }>(
          "PATCH",
          `/admin/articles/${id(articleId)}`,
          patch,
        ),
      remove: (articleId: string) => request<void>("DELETE", `/admin/articles/${id(articleId)}`),
      archive: (articleId: string) => request<Article>("POST", `/admin/articles/${id(articleId)}/archive`),
      unarchive: (articleId: string) => request<Article>("POST", `/admin/articles/${id(articleId)}/unarchive`),
      publish: (articleId: string, input: { version: number; locales?: Locale[] }) =>
        request<{ deployment: Deployment; article: Article }>("POST", `/admin/articles/${id(articleId)}/publish`, input),
      unpublish: (articleId: string, input: { version: number }) =>
        request<{ deployment: Deployment; article: Article }>("POST", `/admin/articles/${id(articleId)}/unpublish`, input),
      revisions: (articleId: string, cursor?: string | null) =>
        request<Page<RevisionSummary>>("GET", `/admin/articles/${id(articleId)}/revisions${query({ cursor })}`),
      checkpoint: (articleId: string) => request<RevisionSummary>("POST", `/admin/articles/${id(articleId)}/revisions`),
      revision: (articleId: string, revision: number) =>
        request<RevisionDocument>("GET", `/admin/articles/${id(articleId)}/revisions/${revision}`),
      restore: (articleId: string, input: { version: number; revision: number }) =>
        request<{ article: Article; backupRevision: number }>("POST", `/admin/articles/${id(articleId)}/restore`, input),
    },

    slugs: {
      check: (locale: Locale, slug: string, articleId: string, signal?: AbortSignal) =>
        request<{ available: boolean; articleId?: string }>(
          "GET",
          `/admin/slugs/${locale}/${id(slug)}${query({ articleId })}`,
          undefined,
          signal,
        ),
    },

    deployments: {
      list: (cursor?: string | null) => request<Page<Deployment>>("GET", `/admin/deployments${query({ cursor })}`),
      get: (deploymentId: string) => request<Deployment>("GET", `/admin/deployments/${id(deploymentId)}`),
    },

    media: {
      list: (cursor?: string | null) => request<Page<Media>>("GET", `/admin/media${query({ cursor })}`),
      get: (mediaId: string) => request<Media & { usages: { articleId: string; scope: string }[] }>("GET", `/admin/media/${id(mediaId)}`),
      createUpload: (input: { filename: string; contentType: string; size: number }) =>
        request<{ media: Media; upload: { url: string; fields: Record<string, string> } }>("POST", "/admin/media/upload-url", input),
      complete: (mediaId: string) => request<Media>("POST", `/admin/media/${id(mediaId)}/complete`),
      update: (mediaId: string, input: { name?: string; alt?: Partial<Record<Locale, string>> }) =>
        request<Media>("PATCH", `/admin/media/${id(mediaId)}`, input),
      remove: (mediaId: string) => request<void>("DELETE", `/admin/media/${id(mediaId)}`),
    },

    publications: {
      list: (params: { cursor?: string | null; articleId?: string } = {}) =>
        request<Page<Publication>>("GET", `/admin/publications${query(params)}`),
      create: (input: { articleId: string; locale: Locale; text?: string; allowDuplicate?: boolean }) =>
        request<Publication>("POST", "/admin/publications", input),
      get: (publicationId: string) => request<Publication>("GET", `/admin/publications/${id(publicationId)}`),
      update: (publicationId: string, input: { version: number; text: string }) =>
        request<Publication>("PATCH", `/admin/publications/${id(publicationId)}`, input),
      remove: (publicationId: string) => request<void>("DELETE", `/admin/publications/${id(publicationId)}`),
      approve: (publicationId: string, version: number) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/approve`, { version }),
      publish: (publicationId: string, version: number) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/publish`, { version }),
      schedule: (publicationId: string, input: { version: number; scheduledAt: string }) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/schedule`, input),
      unschedule: (publicationId: string, version: number) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/unschedule`, { version }),
      markPublished: (publicationId: string, input: { version: number; remoteUrl?: string }) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/mark-published`, input),
      reset: (publicationId: string, version: number) =>
        request<Publication>("POST", `/admin/publications/${id(publicationId)}/reset`, { version, confirmChecked: true }),
    },

    labs: {
      queue: () => request<QueueLabOverview>("GET", "/admin/labs/queue"),
      startRun: (input: { messageCount: number; failureScenario: RunScenario }) => request<StartedRun>("POST", "/admin/labs/queue-runs", input),
      run: (runId: string, signal?: AbortSignal) => request<QueueRun>("GET", `/admin/labs/queue-runs/${id(runId)}`, undefined, signal),
    },

    linkedin: {
      status: () => request<LinkedInStatus>("GET", "/admin/integrations/linkedin"),
      authorize: () => request<{ url: string }>("POST", "/admin/integrations/linkedin/authorize"),
      disconnect: () => request<void>("DELETE", "/admin/integrations/linkedin"),
    },
  };
}

export type StudioApi = ReturnType<typeof createStudioApi>;

/** The API client bound to the signed-in session. */
export function useStudioApi(): StudioApi {
  const { config, getAccessToken, markExpired } = useAuth();
  return useMemo(
    () =>
      createStudioApi({
        apiUrl: config?.apiUrl ?? "",
        getAccessToken,
        onUnauthorized: markExpired,
      }),
    [config, getAccessToken, markExpired],
  );
}

/** S3 presigned POST: the file goes last, after the signed fields. */
export async function uploadToS3(upload: { url: string; fields: Record<string, string> }, file: File): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(upload.fields)) form.append(key, value);
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(upload.url, { method: "POST", body: form });
  } catch {
    throw new ApiError(0, "network_error", { message: "Falha de rede no envio." });
  }
  if (!response.ok) throw new ApiError(response.status, "upload_rejected", { message: "O armazenamento recusou o arquivo." });
}
