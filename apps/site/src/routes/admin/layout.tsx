import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import { AuthProvider, useAuth } from "../../auth/AuthProvider";
import { AdminShell } from "../../features/admin/AdminShell";
import { Loading, ToastProvider } from "../../features/admin/ui";

import "../../features/admin/admin.css";

export function meta() {
  return [{ title: "Portfolio Studio" }, { name: "robots", content: "noindex, nofollow" }];
}

function SessionExpired() {
  const { signIn } = useAuth();
  const location = useLocation();
  return (
    <div className="admin-session" role="alert">
      <p>
        <strong>Sua sessão expirou.</strong> As alterações não salvas ficam guardadas nesta aba enquanto você entra de novo.
      </p>
      <button type="button" className="admin-button" data-variant="primary" onClick={() => void signIn(location.pathname + location.search)}>
        Entrar novamente
      </button>
    </div>
  );
}

function Gate() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const returnTo = location.pathname + location.search;

  useEffect(() => {
    if (status === "signedOut") void signIn(returnTo);
    // Only when the status changes: the redirect happens once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "unconfigured") {
    return (
      <div className="admin-center">
        <h1>Portfolio Studio</h1>
        <p>Este build não tem a configuração do Studio (API e Cognito). Veja o README do repositório.</p>
        <a className="admin-link" href="/pt">
          Voltar ao site
        </a>
      </div>
    );
  }
  if (status === "loading") return <Loading label="Verificando a sessão…" />;
  if (status === "signedOut") {
    return (
      <div className="admin-center">
        <Loading label="Redirecionando para o login…" />
        <button type="button" className="admin-button" onClick={() => void signIn(returnTo)}>
          Entrar
        </button>
      </div>
    );
  }

  // When the session expires the page stays mounted, so nothing typed is lost.
  return (
    <AdminShell banner={status === "expired" ? <SessionExpired /> : undefined}>
      <Outlet />
    </AdminShell>
  );
}

export default function AdminLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
