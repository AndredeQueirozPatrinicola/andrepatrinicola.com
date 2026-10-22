import { useState } from "react";
import { useNavigate } from "react-router";

import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import { errorMessage, localeLabel, typeLabel, useToast } from "../../features/admin/ui";
import { locales, type Locale } from "../../i18n/config";

export function meta() {
  return [{ title: "Novo artigo · Portfolio Studio" }];
}

export default function ArticleNewRoute() {
  const api = useStudioApi();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"article" | "build_log">("article");
  const [locale, setLocale] = useState<Locale>("pt");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader title="Novo artigo" description="O artigo nasce como rascunho em um idioma; os outros podem ser criados depois." />
      <form
        className="admin-card admin-fields admin-narrow"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            const article = await api.articles.create({ type, locale, ...(title.trim() ? { title: title.trim() } : {}) });
            navigate(`/admin/articles/${article.id}/edit`, { replace: true });
          } catch (error) {
            notify("error", errorMessage(error));
            setBusy(false);
          }
        }}
      >
        <label className="admin-field">
          <span className="label">Título</span>
          <input value={title} maxLength={160} autoFocus onChange={(event) => setTitle(event.target.value)} />
        </label>
        <fieldset className="admin-fieldset">
          <legend className="label">Tipo</legend>
          {(["article", "build_log"] as const).map((value) => (
            <label key={value} className="admin-check">
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} />
              <span>
                {typeLabel[value]}
                <span className="admin-muted">
                  {value === "article" ? " · texto técnico completo" : " · registro curto da evolução de um projeto"}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="admin-field">
          <span className="label">Idioma inicial</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            {locales.map((value) => (
              <option key={value} value={value}>
                {localeLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-actions">
          <button type="submit" className="admin-button" data-variant="primary" disabled={busy} aria-busy={busy}>
            Criar rascunho
          </button>
        </div>
      </form>
    </>
  );
}
