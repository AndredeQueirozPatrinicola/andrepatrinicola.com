/**
 * Client of the assistant endpoint (andrepatrinicola-api, POST /ai/chat).
 * Everything the API sends back is treated as untrusted text: sources are
 * kept only when they point to this site.
 */
import type { Locale } from "../../i18n/config";
import { SITE_URL } from "../../seo/site";

export const CHAT_API_URL = import.meta.env.VITE_AI_CHAT_API_URL;
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const assistantEnabled = Boolean(CHAT_API_URL && TURNSTILE_SITE_KEY);

/** Same limit as the API (AI_MAX_QUESTION_CHARS). */
export const MAX_QUESTION_CHARS = 500;
const TIMEOUT_MS = 30_000;

export type SourceType = "article" | "project" | "game" | "resume" | "profile";
export type Source = { title: string; url: string; type: SourceType };

export type ChatErrorKind =
  | "verification"
  | "invalid"
  | "session_expired"
  | "conversation_limit"
  | "rate_limited"
  | "daily_limit"
  | "busy"
  | "unavailable"
  | "failed";

export type ChatAnswer = { answer: string; sources: Source[]; sessionToken: string; remaining: number; fallback: boolean };
export type ChatResult = { ok: true; value: ChatAnswer } | { ok: false; error: ChatErrorKind };

export type ChatRequest = { message: string; locale: Locale; sessionToken?: string; turnstileToken?: string };

const sourceTypes: SourceType[] = ["article", "project", "game", "resume", "profile"];

function siteOrigins(): string[] {
  const origins = [new URL(SITE_URL).origin];
  if (typeof window !== "undefined") origins.push(window.location.origin);
  return origins;
}

/** A link of this site, or nothing. */
export function safeSource(value: unknown): Source | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { title, url, type } = value as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim() || typeof url !== "string" || !sourceTypes.includes(type as SourceType)) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!["https:", "http:"].includes(parsed.protocol) || !siteOrigins().includes(parsed.origin)) return undefined;
  return { title: title.slice(0, 150), url: parsed.toString(), type: type as SourceType };
}

function parseAnswer(body: unknown): ChatAnswer | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  if (typeof value.answer !== "string" || typeof value.sessionToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.sessionToken)) return undefined;
  const sources = Array.isArray(value.sources) ? value.sources.map(safeSource).filter((source): source is Source => Boolean(source)) : [];
  return {
    answer: value.answer.slice(0, 4000),
    sources: sources.slice(0, 6),
    sessionToken: value.sessionToken,
    remaining: typeof value.remaining === "number" && value.remaining >= 0 ? Math.floor(value.remaining) : 0,
    fallback: value.fallback === true,
  };
}

export function errorFor(status: number, body: { error?: unknown; fields?: unknown } | undefined): ChatErrorKind {
  const code = typeof body?.error === "string" ? body.error : "";
  if (status === 400) return Array.isArray(body?.fields) && body.fields.includes("turnstileToken") ? "verification" : "invalid";
  if (status === 409) return "session_expired";
  if (status === 413) return "invalid";
  if (status === 429) {
    return (["conversation_limit", "rate_limited", "daily_limit", "busy"] as const).find((kind) => kind === code) ?? "busy";
  }
  if (status === 503) return "unavailable";
  return "failed";
}

export async function askAssistant(request: ChatRequest, fetcher: typeof fetch = fetch): Promise<ChatResult> {
  if (!CHAT_API_URL) return { ok: false, error: "unavailable" };
  let response: Response;
  try {
    response = await fetcher(CHAT_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: request.message,
        locale: request.locale,
        ...(request.sessionToken ? { sessionToken: request.sessionToken } : {}),
        ...(request.turnstileToken && !request.sessionToken ? { turnstileToken: request.turnstileToken } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "failed" };
  }
  const body = (await response.json().catch(() => undefined)) as Record<string, unknown> | undefined;
  if (!response.ok) return { ok: false, error: errorFor(response.status, body) };
  const value = parseAnswer(body);
  return value ? { ok: true, value } : { ok: false, error: "failed" };
}
