import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { ApiError, useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import type { ArticleListItem, Publication } from "../../features/admin/types";
import {
  Dialog,
  EmptyState,
  ErrorState,
  Loading,
  StatusBadge,
  errorMessage,
  formatDateTime,
  localeLabel,
  publicationStatusLabel,
  usePagedList,
  useResource,
  useToast,
} from "../../features/admin/ui";
import type { Locale } from "../../i18n/config";

export function meta() {
  return [{ title: "Divulgação · Portfolio Studio" }];
}

function NewPublication({ open, onClose }: { open: boolean; onClose: () => void }) {
  const api = useStudioApi();
  const navigate = useNavigate();
  const { notify } = useToast();
  const published = useResource(
    async () => (open ? (await api.articles.list({ status: "published", limit: 50 })).items : null),
    [api, open],
  );
  const articles: ArticleListItem[] | null = published.data ?? null;
  const [articleId, setArticleId] = useState("");
  const [locale, setLocale] = useState<Locale | "">("");
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const article = articles?.find((item) => item.id === articleId);
  const liveLocales = article?.live ? (Object.keys(article.live.slugs) as Locale[]) : [];

  async function create(allowDuplicate = false) {
    if (!articleId || !locale) return;
    setBusy(true);
    try {
      const publication = await api.publications.create({ articleId, locale, ...(allowDuplicate ? { allowDuplicate } : {}) });
      navigate(`/admin/publications/${publication.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "duplicate") setDuplicate(true);
      else notify("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo post para o LinkedIn">
      {published.error ? (
        <ErrorState error={published.error} onRetry={published.reload} />
      ) : !articles ? (
        <Loading />
      ) : articles.length === 0 ? (
        <p>Publique um artigo no site antes: o post sempre aponta para a página publicada.</p>
      ) : (
        <form
          className="admin-fields"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label className="admin-field">
            <span className="label">Artigo publicado</span>
            <select
              value={articleId}
              required
              onChange={(event) => {
                setArticleId(event.target.value);
                setLocale("");
                setDuplicate(false);
              }}
            >
              <option value="">Escolha…</option>
              {articles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.locales.pt?.title || item.locales.en?.title || item.locales.es?.title || item.id}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="label">Idioma do post</span>
            <select value={locale} required disabled={!article} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="">Escolha…</option>
              {liveLocales.map((value) => (
                <option key={value} value={value}>
                  {localeLabel[value]}
                </option>
              ))}
            </select>
          </label>
          {duplicate && (
            <p className="admin-warning" role="alert">
              Já existe um post agendado ou publicado deste artigo neste idioma.{" "}
              <button type="button" className="admin-link-button" onClick={() => void create(true)}>
                Criar mesmo assim
              </button>
            </p>
          )}
          <p className="admin-muted">O rascunho começa com título, resumo, link e tags do artigo. Nada é publicado sem a sua aprovação.</p>
          <div className="admin-dialog-actions">
            <button type="submit" className="admin-button" data-variant="primary" disabled={busy || !articleId || !locale}>
              Criar rascunho
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export default function PublicationsRoute() {
  const api = useStudioApi();
  const [creating, setCreating] = useState(false);
  const list = usePagedList((cursor) => api.publications.list({ cursor }), [api]);
  const items: Publication[] | null = list.items;

  return (
    <>
      <PageHeader
        title="Divulgação"
        description="O site é a fonte; o LinkedIn distribui. Cada post é revisado e aprovado antes de sair."
        actions={
          <button type="button" className="admin-button" data-variant="primary" onClick={() => setCreating(true)}>
            Novo post
          </button>
        }
      />
      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {items === null && !list.error && <Loading />}
      {items && items.length === 0 && <EmptyState title="Nenhum post ainda." />}
      {items && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Artigo</th>
                <th scope="col">Idioma</th>
                <th scope="col">Estado</th>
                <th scope="col">Quando</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="admin-link" to={`/admin/publications/${item.id}`}>
                      {item.articleTitle || "Sem título"}
                    </Link>
                  </td>
                  <td>{item.locale.toUpperCase()}</td>
                  <td>
                    <StatusBadge status={item.status} label={publicationStatusLabel[item.status]} />
                    {item.lastError?.uncertain && <span className="admin-badge" data-status="failed">Verificar</span>}
                  </td>
                  <td>{formatDateTime(item.publishedAt ?? item.scheduledAt ?? item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.hasMore && (
        <button type="button" className="admin-button" onClick={() => void list.loadMore()} disabled={list.loadingMore}>
          Carregar mais
        </button>
      )}
      <NewPublication open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
