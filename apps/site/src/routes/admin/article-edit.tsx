import { Link, useParams } from "react-router";

import { useStudioApi } from "../../features/admin/api";
import { ArticleEditor } from "../../features/admin/articles/ArticleEditor";
import { ErrorState, Loading, useResource } from "../../features/admin/ui";

export function meta() {
  return [{ title: "Editar artigo · Portfolio Studio" }];
}

export default function ArticleEditRoute() {
  const { id = "" } = useParams();
  const api = useStudioApi();
  const article = useResource((signal) => api.articles.get(id, signal), [api, id]);

  if (article.loading) return <Loading label="Abrindo artigo…" />;
  if (article.error || !article.data) {
    return (
      <>
        <ErrorState error={article.error} onRetry={article.reload} />
        <Link className="admin-link" to="/admin/articles">
          Voltar aos artigos
        </Link>
      </>
    );
  }
  return <ArticleEditor key={article.data.id} initial={article.data} />;
}
