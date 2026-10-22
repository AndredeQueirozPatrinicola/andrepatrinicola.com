import "../../features/admin/admin.css";

export function meta() {
  return [{ title: "Sessão encerrada · Portfolio Studio" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function AdminSignedOut() {
  return (
    <main className="admin-center">
      <h1>Portfolio Studio</h1>
      <p>Você saiu. A sessão foi encerrada também no provedor de login.</p>
      <p className="admin-row">
        <a className="admin-button" data-variant="primary" href="/admin">
          Entrar novamente
        </a>
        <a className="admin-link" href="/pt">
          Voltar ao site
        </a>
      </p>
    </main>
  );
}
