import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { locales, type Locale } from "../../../i18n/config";
import { ApiError, useStudioApi } from "../api";
import type { Article, Deployment } from "../types";
import {
  ConfirmDialog,
  StatusBadge,
  deploymentStatusLabel,
  errorMessage,
  formatDateTime,
  localeLabel,
  useToast,
} from "../ui";
import { missingForReady, type ArticleDraft } from "./useArticleDraft";

const pollMs = 4000;
const terminal = new Set(["succeeded", "failed", "cancelled", "superseded"]);
const fieldNames: Record<string, string> = { title: "título", slug: "slug", excerpt: "resumo", content: "corpo" };

export const publicUrl = (locale: Locale, slug: string) => `${window.location.origin}/${locale}/blog/${slug}`;

/** Follows a deployment until it finishes, then reloads the article. */
function useDeploymentProgress(deploymentId: string | undefined, onFinished: (deployment: Deployment) => void) {
  const api = useStudioApi();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const finished = useRef(onFinished);
  useLayoutEffect(() => {
    finished.current = onFinished;
  });

  useEffect(() => {
    if (!deploymentId) return;
    let active = true;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const current = await api.deployments.get(deploymentId);
        if (!active) return;
        setDeployment(current);
        if (terminal.has(current.status)) {
          finished.current(current);
          return;
        }
      } catch {
        // Keep polling: a transient error must not hide the result.
      }
      if (active) timer = window.setTimeout(() => void tick(), pollMs);
    };
    void tick();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, deploymentId]);

  return deployment && deployment.id === deploymentId ? deployment : null;
}

export function PublishPanel({ draft }: { draft: ArticleDraft }) {
  const api = useStudioApi();
  const { notify } = useToast();
  const navigate = useNavigate();
  const article = draft.server;
  const [selected, setSelected] = useState<Locale[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"unpublish" | "archive" | "delete" | null>(null);
  // Follows the deployment started here or found pending on the article, once.
  const [started, setStarted] = useState<string | undefined>(undefined);
  const [followed, setFollowed] = useState<string[]>([]);
  const candidate = started ?? article.pending?.deploymentId;
  const tracking = candidate && !followed.includes(candidate) ? candidate : undefined;

  const deployment = useDeploymentProgress(tracking, async (finished) => {
    setFollowed((current) => [...current, finished.id]);
    setStarted(undefined);
    const fresh = await api.articles.get(article.id).catch(() => null);
    if (fresh) draft.setServer(fresh);
    if (finished.status === "succeeded") notify("success", "Publicação concluída: o site já está atualizado.");
    else if (finished.status === "superseded") notify("info", "Outra publicação mais recente levou estas alterações.");
    else notify("error", `A publicação ${deploymentStatusLabel[finished.status].toLowerCase()}. O site continua como antes.`);
  });

  const readiness = locales.map((locale) => {
    const localeDraft = draft.drafts[locale];
    const missing = localeDraft ? missingForReady(localeDraft) : ["title", "slug", "excerpt", "content"];
    return {
      locale,
      exists: Boolean(localeDraft),
      ready: Boolean(localeDraft && localeDraft.translationStatus === "ready" && missing.length === 0),
      missing,
      live: article.live?.slugs[locale],
    };
  });
  const readyLocales = readiness.filter((item) => item.ready).map((item) => item.locale);
  const chosen = (selected ?? readyLocales).filter((locale) => readyLocales.includes(locale));
  const inProgress = Boolean(article.pending && !article.pendingStale) || Boolean(tracking);

  async function act(run: () => Promise<{ deployment: Deployment; article: Article }>, success: string) {
    setBusy(true);
    try {
      if (!(await draft.save())) {
        notify("error", "Salve as alterações antes de publicar.");
        return;
      }
      const result = await run();
      draft.setServer(result.article);
      setStarted(result.deployment.id);
      notify("info", success);
    } catch (error) {
      if (error instanceof ApiError && error.code === "slug_taken") {
        notify("error", `O slug em ${String(error.body.locale ?? "").toUpperCase()} já pertence a outro artigo publicado.`);
      } else if (error instanceof ApiError && error.code === "upstream_error") {
        notify("error", "O GitHub recusou iniciar o deploy. Nada foi publicado; tente de novo em instantes.");
        const fresh = await api.articles.get(article.id).catch(() => null);
        if (fresh) draft.setServer(fresh);
      } else {
        notify("error", errorMessage(error));
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function simple(run: () => Promise<Article | void>, success: string, after?: () => void) {
    setBusy(true);
    try {
      if (!(await draft.save())) {
        notify("error", "Não foi possível salvar as alterações pendentes.");
        return;
      }
      const result = await run();
      if (result) draft.reset(result);
      notify("success", success);
      after?.();
    } catch (error) {
      notify("error", errorMessage(error));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="publish-title">
      <h2 id="publish-title" className="admin-panel-title">
        Publicação
      </h2>

      {article.live ? (
        <div className="admin-live">
          <p>
            No ar desde {formatDateTime(article.live.publishedAt)} · revisão {article.live.revision}
          </p>
          <ul className="admin-list-plain">
            {(Object.entries(article.live.slugs) as [Locale, string][]).map(([locale, slug]) => (
              <li key={locale}>
                <a className="admin-link" href={publicUrl(locale, slug)} target="_blank" rel="noreferrer">
                  {locale.toUpperCase()} · /{locale}/blog/{slug}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="admin-muted">Ainda não está no site.</p>
      )}

      {(deployment || article.pending) && (
        <div className="admin-progress" role="status">
          <p>
            <strong>{article.pending?.action === "unpublish" ? "Removendo do site" : "Publicando"}</strong>
            {deployment && (
              <>
                {" "}
                · <StatusBadge status={deployment.status} label={deploymentStatusLabel[deployment.status]} />
              </>
            )}
          </p>
          {deployment?.runUrl && (
            <a className="admin-link" href={deployment.runUrl} target="_blank" rel="noreferrer">
              Ver execução no GitHub Actions
            </a>
          )}
          {article.pendingStale && <p className="admin-warning">O deploy não respondeu há mais de uma hora. Você pode publicar de novo.</p>}
        </div>
      )}

      {article.lastError && !inProgress && (
        <p className="admin-warning" role="alert">
          Última publicação falhou em {formatDateTime(article.lastError.at)}: {article.lastError.message}
        </p>
      )}

      <fieldset className="admin-fieldset" disabled={busy || inProgress}>
        <legend className="label">Idiomas a publicar</legend>
        {readiness.map((item) => (
          <label key={item.locale} className="admin-check">
            <input
              type="checkbox"
              checked={chosen.includes(item.locale)}
              disabled={!item.ready}
              onChange={(event) =>
                setSelected((current) => {
                  const base = current ?? readyLocales;
                  return event.target.checked ? [...base, item.locale] : base.filter((locale) => locale !== item.locale);
                })
              }
            />
            <span>
              {localeLabel[item.locale]}
              <span className="admin-muted">
                {" "}
                ·{" "}
                {item.ready
                  ? "pronto"
                  : !item.exists
                    ? "sem versão"
                    : item.missing.length
                      ? `falta ${item.missing.map((field) => fieldNames[field]).join(", ")}`
                      : "marque como pronto"}
                {item.live ? " · no ar" : ""}
              </span>
            </span>
          </label>
        ))}
        <p className="admin-muted">Idiomas não marcados ficam fora do site; nenhum idioma é preenchido com outro.</p>
      </fieldset>

      <div className="admin-actions">
        <button
          type="button"
          className="admin-button"
          data-variant="primary"
          disabled={busy || inProgress || chosen.length === 0 || article.status === "archived"}
          aria-busy={busy}
          onClick={() =>
            void act(
              () => api.articles.publish(article.id, { version: draft.version(), locales: chosen }),
              "Publicação iniciada. Acompanhe o deploy aqui.",
            )
          }
        >
          {article.live ? "Publicar alterações" : "Publicar"}
        </button>
        {article.live && (
          <button type="button" className="admin-button" disabled={busy || inProgress} onClick={() => setConfirm("unpublish")}>
            Despublicar
          </button>
        )}
        {!article.live && article.status === "draft" && (
          <button type="button" className="admin-button" disabled={busy || inProgress} onClick={() => setConfirm("archive")}>
            Arquivar
          </button>
        )}
        {article.status === "archived" && (
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() => void simple(() => api.articles.unarchive(article.id), "Artigo de volta aos rascunhos.")}
          >
            Restaurar para rascunho
          </button>
        )}
        {!article.live && !article.publishedAt && !article.pending && (
          <button type="button" className="admin-button" data-variant="danger" disabled={busy} onClick={() => setConfirm("delete")}>
            Excluir
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "unpublish"}
        title="Despublicar artigo?"
        message="As páginas do artigo saem do site, do sitemap e do RSS no próximo deploy. O rascunho e as revisões continuam aqui, e o artigo fica arquivado."
        confirmLabel="Despublicar"
        tone="danger"
        busy={busy}
        onConfirm={() =>
          void act(() => api.articles.unpublish(article.id, { version: draft.version() }), "Remoção iniciada. Acompanhe o deploy aqui.")
        }
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "archive"}
        title="Arquivar rascunho?"
        message="Arquivados não aparecem na lista padrão e não podem ser editados até voltarem a rascunho."
        confirmLabel="Arquivar"
        busy={busy}
        onConfirm={() => void simple(() => api.articles.archive(article.id), "Artigo arquivado.")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Excluir rascunho?"
        message="O rascunho e todas as revisões serão apagados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        tone="danger"
        busy={busy}
        onConfirm={() =>
          void simple(
            async () => {
              draft.discardBackup();
              await api.articles.remove(article.id);
            },
            "Rascunho excluído.",
            () => navigate("/admin/articles", { replace: true }),
          )
        }
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}
