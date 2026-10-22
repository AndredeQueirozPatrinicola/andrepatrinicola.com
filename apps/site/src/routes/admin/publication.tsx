import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import type { LinkedInStatus, Publication } from "../../features/admin/types";
import {
  ConfirmDialog,
  ErrorState,
  Loading,
  StatusBadge,
  errorMessage,
  formatDateTime,
  localeLabel,
  publicationStatusLabel,
  useNow,
  useResource,
  useToast,
} from "../../features/admin/ui";

export function meta() {
  return [{ title: "Post · Portfolio Studio" }];
}

const limit = 3000;

/** LinkedIn's own composer, pre-filled: the manual path needs no API access. */
export const linkedInComposeUrl = (text: string) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

/** `datetime-local` value (local time) → ISO in UTC. */
export function localInputToIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function PostPreview({ publication, text }: { publication: Publication; text: string }) {
  return (
    <div className="admin-post-preview" aria-label="Prévia do post">
      <div className="admin-post-author">
        <span className="admin-avatar" aria-hidden="true">
          AP
        </span>
        <span>
          <strong>André Patrinicola</strong>
          <span className="admin-muted">Agora · público</span>
        </span>
      </div>
      <p className="admin-post-text">{text || "…"}</p>
      <a className="admin-post-link" href={publication.url} target="_blank" rel="noreferrer">
        <strong>{publication.articleTitle}</strong>
        <span className="admin-muted">{new URL(publication.url).host}</span>
      </a>
    </div>
  );
}

export default function PublicationRoute() {
  const { id = "" } = useParams();
  const api = useStudioApi();
  const navigate = useNavigate();
  const { notify } = useToast();
  const resource = useResource(
    async () => {
      const [publication, linkedin] = await Promise.all([api.publications.get(id), api.linkedin.status().catch(() => null)]);
      return { publication, linkedin };
    },
    [api, id],
  );
  const [edited, setEdited] = useState<{ key: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(15_000);
  const [scheduleAt, setScheduleAt] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [confirm, setConfirm] = useState<"publish" | "delete" | "reset" | "manual" | null>(null);

  const publication = resource.data?.publication;
  const linkedin: LinkedInStatus | null = resource.data?.linkedin ?? null;
  // Local edits belong to one version of the post; a new version starts from its text.
  const versionKey = publication ? `${publication.id}:${publication.version}` : "";
  const text = edited?.key === versionKey ? edited.text : (publication?.text ?? "");
  const setText = (value: string) => setEdited({ key: versionKey, text: value });

  if (resource.loading) return <Loading />;
  if (resource.error || !publication) return <ErrorState error={resource.error} onRetry={resource.reload} />;

  const set = (next: Publication) => resource.setData((current) => ({ linkedin: current?.linkedin ?? null, publication: next }));
  const editable = ["draft", "approved", "failed"].includes(publication.status) && !publication.lastError?.uncertain;
  const changed = text !== publication.text;
  const uncertain = Boolean(publication.lastError?.uncertain);
  const canUseApi = Boolean(linkedin?.configured && linkedin.connected);

  async function run(action: () => Promise<Publication | void>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      if (result) set(result);
      notify(result?.status === "failed" ? "error" : "success", result?.status === "failed" ? result.lastError?.message ?? "Falhou." : success);
    } catch (error) {
      notify("error", errorMessage(error));
      resource.reload();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      notify("success", "Texto copiado.");
    } catch {
      notify("error", "Não foi possível copiar; selecione o texto manualmente.");
    }
  }

  return (
    <>
      <PageHeader
        title={publication.articleTitle || "Post"}
        description={
          <>
            LinkedIn · {localeLabel[publication.locale]} · <StatusBadge status={publication.status} label={publicationStatusLabel[publication.status]} />
            {publication.scheduledAt && publication.status === "scheduled" && ` · ${formatDateTime(publication.scheduledAt)}`}
          </>
        }
        actions={
          <Link className="admin-link" to="/admin/publications">
            Todos os posts
          </Link>
        }
      />

      {publication.lastError && publication.status === "failed" && (
        <div className="admin-warning" role="alert">
          <p>
            {publication.lastError.message} ({formatDateTime(publication.lastError.at)})
          </p>
          {uncertain && (
            <p>
              O LinkedIn pode ter criado o post mesmo assim. Confira seu perfil antes de qualquer nova tentativa.
            </p>
          )}
        </div>
      )}

      <div className="admin-grid-2">
        <section className="admin-card admin-fields" aria-labelledby="post-text">
          <label className="admin-field">
            <span id="post-text" className="label">
              Texto <span className="admin-counter" data-over={text.length > limit || undefined}>{text.length}/{limit}</span>
            </span>
            <textarea rows={14} value={text} maxLength={limit} disabled={!editable || busy} onChange={(event) => setText(event.target.value)} lang={publication.locale} />
          </label>
          <p className="admin-muted">Link do artigo: {publication.url}</p>
          {editable && (
            <div className="admin-actions">
              <button
                type="button"
                className="admin-button"
                disabled={!changed || busy || !text.trim()}
                onClick={() => void run(() => api.publications.update(publication.id, { version: publication.version, text }), "Texto salvo. Aprove de novo para publicar.")}
              >
                Salvar texto
              </button>
            </div>
          )}
        </section>

        <section className="admin-card" aria-labelledby="post-preview">
          <h2 id="post-preview" className="admin-panel-title">
            Prévia
          </h2>
          <PostPreview publication={publication} text={text} />
        </section>
      </div>

      <section className="admin-card" aria-labelledby="post-actions">
        <h2 id="post-actions" className="admin-panel-title">
          Próximo passo
        </h2>

        {publication.status === "draft" && (
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              data-variant="primary"
              disabled={busy || changed}
              title={changed ? "Salve o texto antes" : undefined}
              onClick={() => void run(() => api.publications.approve(publication.id, publication.version), "Post aprovado.")}
            >
              Aprovar texto
            </button>
            <button type="button" className="admin-button" data-variant="danger" disabled={busy} onClick={() => setConfirm("delete")}>
              Excluir rascunho
            </button>
          </div>
        )}

        {(publication.status === "approved" || (publication.status === "failed" && !uncertain)) && (
          <div className="admin-steps">
            <div>
              <h3 className="label">Publicar pela API</h3>
              {canUseApi ? (
                <button type="button" className="admin-button" data-variant="primary" disabled={busy || changed} onClick={() => setConfirm("publish")}>
                  Publicar agora no LinkedIn
                </button>
              ) : (
                <p className="admin-muted">
                  {linkedin?.configured ? "Conecte o LinkedIn em " : "Integração não configurada. Veja "}
                  <Link className="admin-link" to="/admin/settings">
                    Configurações
                  </Link>
                  .
                </p>
              )}
            </div>
            {publication.status === "approved" && canUseApi && (
              <form
                className="admin-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const iso = localInputToIso(scheduleAt);
                  if (!iso) return;
                  void run(() => api.publications.schedule(publication.id, { version: publication.version, scheduledAt: iso }), "Post agendado.");
                }}
              >
                <label className="admin-field" data-inline>
                  <span className="label">Agendar para ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    required
                    min={toLocalInput(new Date(now + 5 * 60_000))}
                    onChange={(event) => setScheduleAt(event.target.value)}
                  />
                </label>
                <button type="submit" className="admin-button" disabled={busy || !scheduleAt || changed}>
                  Agendar
                </button>
              </form>
            )}
            <div>
              <h3 className="label">Publicar à mão</h3>
              <div className="admin-row">
                <button type="button" className="admin-button" onClick={() => void copy()}>
                  Copiar texto
                </button>
                <a className="admin-button" href={linkedInComposeUrl(text)} target="_blank" rel="noreferrer">
                  Abrir o LinkedIn
                </a>
                <button type="button" className="admin-button" disabled={busy} onClick={() => setConfirm("manual")}>
                  Registrar como publicado
                </button>
              </div>
            </div>
          </div>
        )}

        {publication.status === "scheduled" && (
          <div className="admin-actions">
            <p>Será publicado em {formatDateTime(publication.scheduledAt)}.</p>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => void run(() => api.publications.unschedule(publication.id, publication.version), "Agendamento cancelado.")}
            >
              Cancelar agendamento
            </button>
          </div>
        )}

        {publication.status === "publishing" && (
          <div className="admin-actions">
            <p role="status">Enviando ao LinkedIn…</p>
            <button type="button" className="admin-button" onClick={resource.reload}>
              Atualizar
            </button>
            {publication.publishingSince && now - Date.parse(publication.publishingSince) > 5 * 60_000 && (
              <button type="button" className="admin-button" onClick={() => setConfirm("reset")}>
                Destravar (conferi o LinkedIn)
              </button>
            )}
          </div>
        )}

        {publication.status === "failed" && uncertain && (
          <div className="admin-actions">
            <button type="button" className="admin-button" onClick={() => setConfirm("manual")}>
              Foi publicado: registrar
            </button>
            <button type="button" className="admin-button" onClick={() => setConfirm("reset")}>
              Não foi publicado: liberar nova tentativa
            </button>
          </div>
        )}

        {publication.status === "published" && (
          <p>
            Publicado em {formatDateTime(publication.publishedAt)} {publication.publishedVia === "manual" ? "(registro manual)" : "pela API"}.{" "}
            {publication.remoteUrl && (
              <a className="admin-link" href={publication.remoteUrl} target="_blank" rel="noreferrer">
                Ver no LinkedIn
              </a>
            )}
          </p>
        )}
      </section>

      <ConfirmDialog
        open={confirm === "publish"}
        title="Publicar no LinkedIn agora?"
        message="O post sai imediatamente no seu perfil, com visibilidade pública."
        confirmLabel="Publicar"
        busy={busy}
        onConfirm={() => void run(() => api.publications.publish(publication.id, publication.version), "Publicado no LinkedIn.")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Excluir este rascunho?"
        message="O texto será apagado."
        confirmLabel="Excluir"
        tone="danger"
        busy={busy}
        onConfirm={() =>
          void run(async () => {
            await api.publications.remove(publication.id);
            navigate("/admin/publications", { replace: true });
          }, "Rascunho excluído.")
        }
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        title="Liberar nova tentativa?"
        message="Confirme que verificou no LinkedIn que o post NÃO foi publicado. Caso contrário ele pode sair duplicado."
        confirmLabel="Conferi, liberar"
        tone="danger"
        busy={busy}
        onConfirm={() => void run(() => api.publications.reset(publication.id, publication.version), "Post liberado para nova tentativa.")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "manual"}
        title="Registrar como publicado"
        message={
          <label className="admin-field">
            <span className="label">Link do post no LinkedIn (opcional)</span>
            <input type="url" value={remoteUrl} placeholder="https://www.linkedin.com/feed/update/…" onChange={(event) => setRemoteUrl(event.target.value)} />
          </label>
        }
        confirmLabel="Registrar"
        busy={busy}
        onConfirm={() =>
          void run(
            () =>
              api.publications.markPublished(publication.id, {
                version: publication.version,
                ...(remoteUrl.trim() ? { remoteUrl: remoteUrl.trim() } : {}),
              }),
            "Publicação registrada.",
          )
        }
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
