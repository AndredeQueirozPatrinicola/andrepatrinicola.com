import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { completeSignIn } from "../../auth/AuthProvider";
import { safeReturnTo } from "../../auth/config";

import "../../features/admin/admin.css";

export function meta() {
  return [{ title: "Entrando · Portfolio Studio" }, { name: "robots", content: "noindex, nofollow" }];
}

// The authorization code can be exchanged only once, even if React runs the effect twice.
let pending: { url: string; promise: Promise<unknown> } | undefined;

export default function AdminCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = window.location.href;
    if (pending?.url !== url) pending = { url, promise: completeSignIn() };
    pending.promise.then(
      (returnTo) => navigate(safeReturnTo(returnTo), { replace: true }),
      () => setFailed(true),
    );
  }, [navigate]);

  return (
    <main className="admin-center">
      <h1>Portfolio Studio</h1>
      {failed ? (
        <>
          <p role="alert">Não foi possível concluir o login. O link pode ter expirado.</p>
          <a className="admin-button" data-variant="primary" href="/admin">
            Tentar de novo
          </a>
        </>
      ) : (
        <p role="status">Concluindo o login…</p>
      )}
    </main>
  );
}
