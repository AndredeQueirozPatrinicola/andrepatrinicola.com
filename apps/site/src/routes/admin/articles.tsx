import { Link, useSearchParams } from "react-router";

import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import type { ArticleStatus } from "../../features/admin/types";
import {
  EmptyState,
  ErrorState,
  Loading,
  StatusBadge,
  articleStatusLabel,
  ArticleTitle,
  formatDateTime,
  typeLabel,
  usePagedList,
} from "../../features/admin/ui";
import { locales } from "../../i18n/config";

export function meta() {
  return [{ title: "Artigos · Portfolio Studio" }];
}

const statuses: (ArticleStatus | "")[] = ["", "draft", "publishing", "published", "archived"];

export default function ArticlesRoute() {
  const api = useStudioApi();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as ArticleStatus | "";
  const type = params.get("type") ?? "";
  const list = usePagedList(
    (cursor) => api.articles.list({ ...(status ? { status } : {}), ...(type ? { type } : {}), cursor }),
    [api, status, type],
  );
  const items = list.items;

  const setFilter = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Artigos"
        actions={
          <Link to="/admin/articles/new" className="admin-button" data-variant="primary">
            Novo artigo
          </Link>
        }
      />
      <div className="admin-filters">
        <label className="admin-field" data-inline>
          <span className="label">Estado</span>
          <select value={status} onChange={(event) => setFilter("status", event.target.value)}>
            {statuses.map((value) => (
              <option key={value || "all"} value={value}>
                {value ? articleStatusLabel[value] : "Todos"}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field" data-inline>
          <span className="label">Tipo</span>
          <select value={type} onChange={(event) => setFilter("type", event.target.value)}>
            <option value="">Todos</option>
            <option value="article">{typeLabel.article}</option>
            <option value="build_log">{typeLabel.build_log}</option>
          </select>
        </label>
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {items === null && !list.error && <Loading />}
      {items && items.length === 0 && (
        <EmptyState title={status || type ? "Nenhum artigo com esses filtros." : "Nenhum artigo ainda."}>
          <Link to="/admin/articles/new" className="admin-button" data-variant="primary">
            Escrever o primeiro
          </Link>
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col">Idiomas</th>
                <th scope="col">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((article) => (
                <tr key={article.id}>
                  <td>
                    <Link to={`/admin/articles/${article.id}/edit`} className="admin-link">
                      <ArticleTitle article={article} />
                    </Link>
                    {article.lastError && !article.pending && <span className="admin-badge" data-status="failed">Falha no deploy</span>}
                  </td>
                  <td>{typeLabel[article.type]}</td>
                  <td>
                    <StatusBadge status={article.status} label={articleStatusLabel[article.status]} />
                  </td>
                  <td>
                    <ul className="admin-locales">
                      {locales.map((locale) => {
                        const localeDraft = article.locales[locale];
                        const state = article.live?.slugs[locale] ? "live" : (localeDraft?.translationStatus ?? "missing");
                        const label = { live: "no ar", ready: "pronto", draft: "rascunho", missing: "sem versão" }[state];
                        return (
                          <li key={locale} data-state={state} title={`${locale.toUpperCase()}: ${label}`}>
                            {locale.toUpperCase()}
                            <span className="visually-hidden">: {label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td>{formatDateTime(article.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.hasMore && (
        <button type="button" className="admin-button" onClick={() => void list.loadMore()} disabled={list.loadingMore} aria-busy={list.loadingMore}>
          Carregar mais
        </button>
      )}
    </>
  );
}
