import { useState } from "react";

import { ArticleContent } from "../../blog/ArticleContent";
import { locales, type Locale } from "../../../i18n/config";
import { useStudioApi } from "../api";
import type { RevisionDocument, RevisionSummary } from "../types";
import { ConfirmDialog, Dialog, ErrorState, Loading, errorMessage, formatDateTime, localeLabel, useToast } from "../ui";
import { previewImages, useMediaPreviews } from "../useMediaPreviews";
import { mediaIdsOfDoc } from "./documents";
import type { ArticleDraft } from "./useArticleDraft";

const reasonLabel: Record<RevisionSummary["reason"], string> = {
  checkpoint: "Checkpoint",
  publish: "Publicação",
  "before-restore": "Antes de restaurar",
};

function RevisionView({ document, onClose }: { document: RevisionDocument; onClose: () => void }) {
  const api = useStudioApi();
  const available = document.locales.map((draft) => draft.locale);
  const [locale, setLocale] = useState<Locale>(available[0] ?? "pt");
  const draft = document.locales.find((item) => item.locale === locale);
  const media = useMediaPreviews(api, draft ? mediaIdsOfDoc(draft.content) : []);

  return (
    <Dialog open title={`Revisão ${document.revision} · ${formatDateTime(document.createdAt)}`} onClose={onClose} size="large">
      <div className="admin-tabs" role="tablist" aria-label="Idioma da revisão">
        {locales
          .filter((item) => available.includes(item))
          .map((item) => (
            <button key={item} type="button" role="tab" aria-selected={item === locale} className="admin-tab" onClick={() => setLocale(item)}>
              {localeLabel[item]}
            </button>
          ))}
      </div>
      {draft && (
        <article className="admin-preview">
          <h1>{draft.title || "Sem título"}</h1>
          {draft.excerpt && <p className="admin-preview-lead">{draft.excerpt}</p>}
          <ArticleContent content={draft.content} images={previewImages(media, locale)} />
        </article>
      )}
    </Dialog>
  );
}

export function RevisionsPanel({ draft }: { draft: ArticleDraft }) {
  const api = useStudioApi();
  const { notify } = useToast();
  const articleId = draft.server.id;
  const [items, setItems] = useState<RevisionSummary[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<RevisionDocument | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  async function load(next: string | null = null) {
    setError(null);
    try {
      const page = await api.articles.revisions(articleId, next);
      setItems((current) => (next ? [...(current ?? []), ...page.items] : page.items));
      setCursor(page.cursor);
    } catch (reason) {
      setError(reason);
    }
  }

  async function checkpoint() {
    setBusy(true);
    try {
      if (!(await draft.save())) throw new Error("save");
      const revision = await api.articles.checkpoint(articleId);
      setItems((current) => [revision, ...(current ?? [])]);
      notify("success", `Revisão ${revision.revision} criada.`);
    } catch (reason) {
      notify("error", reason instanceof Error && reason.message === "save" ? "Salve as alterações antes." : errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function view(revision: number) {
    try {
      setViewing(await api.articles.revision(articleId, revision));
    } catch (reason) {
      notify("error", errorMessage(reason));
    }
  }

  async function restore(revision: number) {
    setBusy(true);
    try {
      if (!(await draft.save())) throw new Error("save");
      const result = await api.articles.restore(articleId, { version: draft.version(), revision });
      draft.reset(result.article);
      notify("success", `Revisão ${revision} restaurada no rascunho. O estado anterior virou a revisão ${result.backupRevision}.`);
      await load();
    } catch (reason) {
      notify("error", reason instanceof Error && reason.message === "save" ? "Salve as alterações antes." : errorMessage(reason));
    } finally {
      setBusy(false);
      setRestoring(null);
    }
  }

  return (
    <details
      className="admin-panel"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open && items === null) void load();
      }}
    >
      <summary className="admin-panel-title">Revisões</summary>
      <p className="admin-muted">
        O salvamento automático não cria revisões. Elas são criadas ao publicar, antes de restaurar e quando você pede um checkpoint.
      </p>
      <button type="button" className="admin-button" data-size="small" onClick={() => void checkpoint()} disabled={busy}>
        Criar checkpoint
      </button>
      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}
      {items === null && !error && <Loading />}
      {items && items.length === 0 && <p className="admin-muted">Nenhuma revisão ainda.</p>}
      {items && items.length > 0 && (
        <ol className="admin-revisions">
          {items.map((item) => (
            <li key={item.revision}>
              <div>
                <strong>#{item.revision}</strong> · {reasonLabel[item.reason]}
                {draft.server.live?.revision === item.revision && <span className="admin-badge" data-status="published">No ar</span>}
                <div className="admin-muted">
                  {formatDateTime(item.createdAt)} · {item.createdBy} · {item.locales.map((locale) => locale.locale.toUpperCase()).join(", ")}
                </div>
              </div>
              <div className="admin-row">
                <button type="button" className="admin-button" data-size="small" onClick={() => void view(item.revision)}>
                  Ver
                </button>
                <button type="button" className="admin-button" data-size="small" disabled={busy} onClick={() => setRestoring(item.revision)}>
                  Restaurar
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {cursor && (
        <button type="button" className="admin-button" data-size="small" onClick={() => void load(cursor)}>
          Mais revisões
        </button>
      )}
      {viewing && <RevisionView document={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog
        open={restoring !== null}
        title={`Restaurar a revisão ${restoring ?? ""}?`}
        message="O rascunho atual vira uma revisão antes, então nada se perde. O site só muda quando você publicar."
        confirmLabel="Restaurar"
        busy={busy}
        onConfirm={() => restoring !== null && void restore(restoring)}
        onCancel={() => setRestoring(null)}
      />
    </details>
  );
}
