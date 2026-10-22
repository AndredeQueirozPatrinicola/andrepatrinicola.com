import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import {
  ArticleTitle,
  ErrorState,
  Loading,
  StatusBadge,
  articleStatusLabel,
  deploymentStatusLabel,
  formatDateTime,
  formatRelative,
  publicationStatusLabel,
  useResource,
} from "../../features/admin/ui";

export function meta() {
  return [{ title: "Painel · Portfolio Studio" }];
}

export default function DashboardRoute() {
  const api = useStudioApi();
  const { email } = useAuth();
  const data = useResource(
    async () => {
      const [articles, deployments, publications, linkedin] = await Promise.all([
        api.articles.list({ limit: 50 }),
        api.deployments.list(),
        api.publications.list(),
        api.linkedin.status().catch(() => null),
      ]);
      return { articles, deployments, publications, linkedin };
    },
    [api],
  );

  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorState error={data.error} onRetry={data.reload} />;
  const { articles, deployments, publications, linkedin } = data.data;
  const count = (status: string) => articles.items.filter((article) => article.status === status).length;
  const more = articles.cursor ? "+" : "";
  const scheduled = publications.items.filter((item) => item.status === "scheduled");
  const failedDeploy = deployments.items.find((item) => item.status === "failed");

  return (
    <>
      <PageHeader
        title="Painel"
        description={email ? `Conectado como ${email}` : undefined}
        actions={
          <Link to="/admin/articles/new" className="admin-button" data-variant="primary">
            Novo artigo
          </Link>
        }
      />
      <ul className="admin-stats">
        {(["draft", "publishing", "published", "archived"] as const).map((status) => (
          <li key={status}>
            <Link to={`/admin/articles?status=${status}`}>
              <span className="admin-stat-value">
                {count(status)}
                {more}
              </span>
              <span className="label">{articleStatusLabel[status]}</span>
            </Link>
          </li>
        ))}
      </ul>

      {failedDeploy && (
        <p className="admin-warning" role="alert">
          O deploy de {formatDateTime(failedDeploy.createdAt)} falhou: {failedDeploy.message ?? "veja o GitHub Actions"}.
        </p>
      )}

      <div className="admin-grid-2">
        <section className="admin-card" aria-labelledby="recent-articles">
          <h2 id="recent-articles" className="admin-panel-title">
            Editados recentemente
          </h2>
          {articles.items.length === 0 ? (
            <p className="admin-muted">Nenhum artigo ainda.</p>
          ) : (
            <ul className="admin-list">
              {articles.items.slice(0, 6).map((article) => (
                <li key={article.id}>
                  <Link className="admin-link" to={`/admin/articles/${article.id}/edit`}>
                    <ArticleTitle article={article} />
                  </Link>
                  <span className="admin-muted">
                    <StatusBadge status={article.status} label={articleStatusLabel[article.status]} /> · {formatRelative(article.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card" aria-labelledby="recent-deploys">
          <h2 id="recent-deploys" className="admin-panel-title">
            Deploys
          </h2>
          {deployments.items.length === 0 ? (
            <p className="admin-muted">Nenhum deploy registrado.</p>
          ) : (
            <ul className="admin-list">
              {deployments.items.slice(0, 6).map((deployment) => (
                <li key={deployment.id}>
                  <span>
                    {{ publish: "Publicação", unpublish: "Remoção", push: "Push no main" }[deployment.trigger]}
                    {deployment.articleCount !== null && ` · ${deployment.articleCount} artigo(s)`}
                  </span>
                  <span className="admin-muted">
                    <StatusBadge status={deployment.status} label={deploymentStatusLabel[deployment.status]} /> ·{" "}
                    {formatRelative(deployment.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card" aria-labelledby="distribution">
          <h2 id="distribution" className="admin-panel-title">
            Divulgação
          </h2>
          <p>
            LinkedIn:{" "}
            {!linkedin?.configured
              ? "integração não configurada (fluxo manual disponível)"
              : linkedin.connected
                ? `conectado até ${formatDateTime(linkedin.expiresAt)}`
                : "desconectado"}
          </p>
          {scheduled.length > 0 ? (
            <ul className="admin-list">
              {scheduled.map((item) => (
                <li key={item.id}>
                  <Link className="admin-link" to={`/admin/publications/${item.id}`}>
                    {item.articleTitle}
                  </Link>
                  <span className="admin-muted">
                    <StatusBadge status={item.status} label={publicationStatusLabel[item.status]} /> · {formatDateTime(item.scheduledAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">Nenhum post agendado.</p>
          )}
          <Link className="admin-link" to="/admin/publications">
            Ver posts
          </Link>
        </section>
      </div>
    </>
  );
}
