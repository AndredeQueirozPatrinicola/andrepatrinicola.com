import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "./api";
import { locales } from "../../i18n/config";
import type { ArticleListItem, ArticleStatus, DeploymentStatus, PublicationStatus } from "./types";

// ------------------------------------------------------------ data loading

export type Resource<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (update: T | ((current: T | undefined) => T)) => void;
};

type Settled<T> = { request: object; data: T | undefined; error: unknown };

/**
 * Loads data for a screen; `deps` restart it and stale answers are dropped.
 * State only changes when a request settles, so "loading" is derived from
 * whether the latest request has settled.
 */
/** A new object whenever one of `deps` changes (compared like effect dependencies). */
function useDepsKey(deps: unknown[]): object {
  const [state, setState] = useState(() => ({ deps, key: {} }));
  const changed = deps.length !== state.deps.length || deps.some((dep, index) => !Object.is(dep, state.deps[index]));
  if (changed) {
    const next = { deps, key: {} };
    setState(next);
    return next.key;
  }
  return state.key;
}

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const request = useDepsKey([...deps, attempt]);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const run = useEffectEvent((signal: AbortSignal) => load(signal));

  useEffect(() => {
    const controller = new AbortController();
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ request, data, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled((current) => ({ request, data: current?.data, error }));
      },
    );
    return () => controller.abort();
  }, [request]);

  const current = settled?.request === request ? settled : null;
  const setData = useCallback(
    (update: T | ((value: T | undefined) => T)) =>
      setSettled((value) => {
        const data = typeof update === "function" ? (update as (item: T | undefined) => T)(value?.data) : update;
        return { request: value?.request ?? {}, data, error: null };
      }),
    [],
  );

  return {
    data: current ? current.data : undefined,
    error: current?.error ?? null,
    loading: !current,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    setData,
  };
}

export type PagedList<T> = {
  items: T[] | null;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => void;
  update: (change: (items: T[]) => T[]) => void;
};

/** A list loaded page by page ("Carregar mais"); `deps` restart it from the first page. */
export function usePagedList<T>(
  fetchPage: (cursor: string | null, signal?: AbortSignal) => Promise<{ items: T[]; cursor: string | null }>,
  deps: unknown[],
  enabled = true,
): PagedList<T> {
  const first = useResource(async (signal) => (enabled ? fetchPage(null, signal) : { items: [] as T[], cursor: null }), [...deps, enabled]);
  const [more, setMore] = useState<{ base: object | undefined; items: T[]; cursor: string | null | undefined }>({
    base: undefined,
    items: [],
    cursor: undefined,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<unknown>(null);
  const [edits, setEdits] = useState<{ base: object | undefined; change: (items: T[]) => T[] }[]>([]);

  const base = first.data as object | undefined;
  const extra = more.base === base ? more : { items: [] as T[], cursor: undefined };
  const cursor = extra.cursor === undefined ? (first.data?.cursor ?? null) : extra.cursor;
  let items = first.data ? [...first.data.items, ...extra.items] : null;
  if (items) for (const edit of edits) if (edit.base === base) items = edit.change(items);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await fetchPage(cursor);
      setMore((current) => ({
        base,
        items: [...(current.base === base ? current.items : []), ...page.items],
        cursor: page.cursor,
      }));
    } catch (error) {
      setMoreError(error);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    items: enabled ? items : null,
    error: first.error ?? moreError,
    hasMore: Boolean(cursor),
    loadingMore,
    loadMore,
    reload: first.reload,
    update: (change) => setEdits((current) => [...current.filter((edit) => edit.base === base), { base, change }]),
  };
}

/** The current time, refreshed every `intervalMs` (render stays pure). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "Sem conexão com a API. Verifique a rede e tente de novo.";
    if (error.status === 401) return "Sua sessão expirou.";
    if (error.status === 403) return "Esta conta não tem permissão de administrador.";
    if (error.status === 404) return "Não encontrado.";
    if (error.status === 429) return "Muitas requisições. Aguarde alguns segundos.";
    if (error.code === "not_configured") return error.message || "Recurso não configurado no servidor.";
    if (error.code === "version_conflict") return "Outra aba ou sessão alterou este conteúdo.";
    if (error.status >= 500) return error.message && error.message !== error.code ? error.message : "Falha no servidor. Tente de novo.";
    return error.message || "Não foi possível concluir a ação.";
  }
  return "Algo deu errado.";
}

// ------------------------------------------------------------ toasts

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
type ToastContextValue = { notify: (tone: Toast["tone"], message: string) => void };

const ToastContext = createContext<ToastContextValue>({ notify: () => undefined });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const notify = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="admin-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="admin-toast" data-tone={toast.tone}>
            <span>{toast.message}</span>
            <button type="button" className="admin-icon-button" aria-label="Fechar aviso" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ------------------------------------------------------------ states

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="admin-loading" role="status">
      <span className="admin-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="admin-error" role="alert">
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="admin-button" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="admin-empty">
      <p className="admin-empty-title">{title}</p>
      {children}
    </div>
  );
}

// ------------------------------------------------------------ dialogs

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "large";
};

/** Native <dialog>: focus trap, Esc and the top layer come from the browser. */
export function Dialog({ open, title, onClose, children, size = "small" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      data-size={size}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="admin-dialog-body">
          <header className="admin-dialog-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="admin-icon-button" aria-label="Fechar" onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

type ConfirmProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, tone = "default", busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <div className="admin-dialog-content">{message}</div>
      <div className="admin-dialog-actions">
        <button type="button" className="admin-button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button
          type="button"
          className="admin-button"
          data-variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------ labels

export const articleStatusLabel: Record<ArticleStatus, string> = {
  draft: "Rascunho",
  publishing: "Publicando",
  published: "Publicado",
  archived: "Arquivado",
};

export const deploymentStatusLabel: Record<DeploymentStatus, string> = {
  queued: "Na fila",
  running: "Em execução",
  succeeded: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
  superseded: "Substituído",
};

export const publicationStatusLabel: Record<PublicationStatus, string> = {
  draft: "Rascunho",
  approved: "Aprovado",
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  failed: "Falhou",
};

export const typeLabel = { article: "Artigo", build_log: "Build log" } as const;
export const localeLabel = { pt: "Português", en: "English", es: "Español" } as const;

/** The first title among the article's languages. */
export function ArticleTitle({ article }: { article: Pick<ArticleListItem, "locales"> }) {
  const first = locales.map((locale) => article.locales[locale]?.title).find(Boolean);
  return <>{first || "Sem título"}</>;
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className="admin-badge" data-status={status}>
      {label}
    </span>
  );
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function formatDateTime(iso: string | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}

export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(seconds, "second");
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
