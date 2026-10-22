import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import type { Deployment } from "../../features/admin/types";
import {
  ConfirmDialog,
  ErrorState,
  Loading,
  StatusBadge,
  deploymentStatusLabel,
  errorMessage,
  formatDateTime,
  useNow,
  usePagedList,
  useResource,
  useToast,
} from "../../features/admin/ui";

export function meta() {
  return [{ title: "Configurações · Portfolio Studio" }];
}

const linkedInMessages: Record<string, [tone: "success" | "error" | "info", text: string]> = {
  connected: ["success", "LinkedIn conectado."],
  denied: ["info", "A conexão com o LinkedIn foi cancelada."],
  expired: ["error", "O pedido de conexão expirou. Tente de novo."],
  error: ["error", "O LinkedIn não concluiu a conexão. Verifique o app e as permissões."],
};

function Deployments() {
  const api = useStudioApi();
  const list = usePagedList((cursor) => api.deployments.list(cursor), [api]);
  const items: Deployment[] | null = list.items;

  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!items) return <Loading />;
  if (!items.length) return <p className="admin-muted">Nenhum deploy registrado.</p>;
  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Início</th>
              <th scope="col">Origem</th>
              <th scope="col">Estado</th>
              <th scope="col">Artigos</th>
              <th scope="col">Execução</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.createdAt)}</td>
                <td>{{ publish: "Publicação", unpublish: "Remoção", push: "Push no main" }[item.trigger]}</td>
                <td>
                  <StatusBadge status={item.status} label={deploymentStatusLabel[item.status]} />
                  {item.stale && <span className="admin-badge" data-status="failed">Sem resposta</span>}
                  {item.message && item.status !== "succeeded" && <div className="admin-muted">{item.message}</div>}
                </td>
                <td>{item.articleCount ?? "—"}</td>
                <td>
                  {item.runUrl ? (
                    <a className="admin-link" href={item.runUrl} target="_blank" rel="noreferrer">
                      GitHub Actions
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.hasMore && (
        <button type="button" className="admin-button" onClick={() => void list.loadMore()} disabled={list.loadingMore}>
          Carregar mais
        </button>
      )}
    </>
  );
}

export default function SettingsRoute() {
  const api = useStudioApi();
  const { email, signOut, config } = useAuth();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const linkedin = useResource(() => api.linkedin.status(), [api]);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const announced = useRef(false);
  const now = useNow(60_000);

  useEffect(() => {
    const result = params.get("linkedin");
    if (!result || announced.current) return;
    announced.current = true;
    const message = linkedInMessages[result];
    if (message) notify(message[0], message[1]);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("linkedin");
      return next;
    }, { replace: true });
  }, [params, setParams, notify]);

  async function connect() {
    setBusy(true);
    try {
      const { url } = await api.linkedin.authorize();
      if (!url.startsWith("https://www.linkedin.com/")) throw new Error("Unexpected authorization URL");
      window.location.assign(url);
    } catch (error) {
      notify("error", errorMessage(error));
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.linkedin.disconnect();
      notify("success", "LinkedIn desconectado e token revogado.");
      linkedin.reload();
    } catch (error) {
      notify("error", errorMessage(error));
    } finally {
      setBusy(false);
      setConfirmDisconnect(false);
    }
  }

  const status = linkedin.data;
  const expiresSoon = status?.expiresAt ? Date.parse(status.expiresAt) - now < 7 * 86_400_000 : false;

  return (
    <>
      <PageHeader title="Configurações" />

      <section className="admin-card" aria-labelledby="account">
        <h2 id="account" className="admin-panel-title">
          Conta
        </h2>
        <p>{email ?? "Administrador"}</p>
        <p className="admin-muted">
          Senha e MFA são gerenciados no login do Cognito. API: <code>{config?.apiUrl}</code>
        </p>
        <button type="button" className="admin-button" onClick={() => void signOut()}>
          Sair
        </button>
      </section>

      <section className="admin-card" aria-labelledby="linkedin">
        <h2 id="linkedin" className="admin-panel-title">
          LinkedIn
        </h2>
        {linkedin.loading && <Loading />}
        {linkedin.error ? <ErrorState error={linkedin.error} onRetry={linkedin.reload} /> : null}
        {status && !status.configured && (
          <p>
            A integração oficial não está configurada no servidor. Os posts continuam funcionando pelo fluxo manual (copiar, abrir o
            LinkedIn e registrar).
          </p>
        )}
        {status?.configured && (
          <>
            {status.connected ? (
              <p>
                Conectado como <strong>{status.name || status.memberUrn}</strong>. O acesso vale até {formatDateTime(status.expiresAt)}
                {status.refreshable ? " e é renovado automaticamente." : "; depois disso, conecte de novo."}
              </p>
            ) : (
              <p>{status.status === "expired" ? "A conexão expirou ou foi revogada." : "Não conectado."}</p>
            )}
            {status.connected && expiresSoon && !status.refreshable && (
              <p className="admin-warning">A conexão expira em menos de 7 dias. Reconecte para não interromper agendamentos.</p>
            )}
            <div className="admin-actions">
              <button type="button" className="admin-button" data-variant="primary" disabled={busy} onClick={() => void connect()}>
                {status.connected ? "Reconectar" : "Conectar LinkedIn"}
              </button>
              {(status.connected || status.status === "expired") && (
                <button type="button" className="admin-button" disabled={busy} onClick={() => setConfirmDisconnect(true)}>
                  Desconectar
                </button>
              )}
            </div>
            <p className="admin-muted">
              Permissões pedidas: perfil básico (OpenID) e publicação em seu nome (w_member_social). O token fica só no servidor.
            </p>
          </>
        )}
      </section>

      <section className="admin-card" aria-labelledby="deploys">
        <h2 id="deploys" className="admin-panel-title">
          Histórico de deploys
        </h2>
        <Deployments />
      </section>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Desconectar o LinkedIn?"
        message="O token é revogado e apagado. Posts agendados vão falhar até você conectar de novo."
        confirmLabel="Desconectar"
        tone="danger"
        busy={busy}
        onConfirm={() => void disconnect()}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </>
  );
}
