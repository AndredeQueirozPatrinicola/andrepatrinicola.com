import { useId, useState } from "react";

import type { Locale } from "../../../i18n/config";
import type { LocaleDraftInput } from "../api";
import { MediaPicker, MediaThumb } from "../media";
import type { Media } from "../types";

const siteName = "André Patrinicola";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A plain approximation of a search result, to judge length and wording. */
export function SearchPreview({ locale, draft }: { locale: Locale; draft: LocaleDraftInput }) {
  const title = `${draft.seoTitle || draft.title || "Título do artigo"} · ${siteName}`;
  const description = draft.seoDescription || draft.excerpt || "O resumo do artigo aparece aqui.";
  const host = typeof window === "undefined" ? "andrepatrinicola.com.br" : window.location.host;
  return (
    <div className="admin-serp" aria-label="Prévia do resultado de busca">
      <p className="admin-serp-url">
        {host} › {locale} › blog › {draft.slug || "slug"}
      </p>
      <p className="admin-serp-title">{truncate(title, 65)}</p>
      <p className="admin-serp-description">{truncate(description, 160)}</p>
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className="admin-counter" data-over={value.length > max || undefined}>
      {value.length}/{max}
    </span>
  );
}

type Props = {
  locale: Locale;
  draft: LocaleDraftInput;
  media: Record<string, Media>;
  onChange: (change: Partial<LocaleDraftInput>) => void;
  onMediaPicked: (media: Media) => void;
  disabled: boolean;
};

export function SeoPanel({ locale, draft, media, onChange, onMediaPicked, disabled }: Props) {
  const [picking, setPicking] = useState(false);
  const id = useId();
  const og = draft.ogMediaId ? media[draft.ogMediaId] : undefined;

  return (
    <details className="admin-panel">
      <summary className="admin-panel-title">SEO e compartilhamento · {locale.toUpperCase()}</summary>
      <div className="admin-fields">
        <label className="admin-field" htmlFor={`${id}-title`}>
          <span className="label">
            Título para buscadores <Counter value={draft.seoTitle ?? ""} max={70} />
          </span>
          <input
            id={`${id}-title`}
            value={draft.seoTitle ?? ""}
            maxLength={70}
            disabled={disabled}
            placeholder={draft.title}
            onChange={(event) => onChange({ seoTitle: event.target.value })}
          />
        </label>
        <label className="admin-field" htmlFor={`${id}-description`}>
          <span className="label">
            Meta description <Counter value={draft.seoDescription ?? ""} max={170} />
          </span>
          <textarea
            id={`${id}-description`}
            rows={3}
            value={draft.seoDescription ?? ""}
            maxLength={170}
            disabled={disabled}
            placeholder={draft.excerpt}
            onChange={(event) => onChange({ seoDescription: event.target.value })}
          />
        </label>
        <label className="admin-field" htmlFor={`${id}-canonical`}>
          <span className="label">URL canônica (só se o texto foi publicado antes em outro lugar)</span>
          <input
            id={`${id}-canonical`}
            type="url"
            value={draft.canonicalUrl ?? ""}
            disabled={disabled}
            placeholder="https://…"
            onChange={(event) => onChange({ canonicalUrl: event.target.value })}
          />
        </label>
        <div className="admin-field">
          <span className="label">Imagem de compartilhamento (Open Graph)</span>
          <div className="admin-row">
            {og ? <div className="admin-og-thumb"><MediaThumb media={og} /></div> : <span className="admin-muted">Usa a capa do artigo.</span>}
            <button type="button" className="admin-button" data-size="small" disabled={disabled} onClick={() => setPicking(true)}>
              Escolher
            </button>
            {draft.ogMediaId && (
              <button type="button" className="admin-button" data-size="small" disabled={disabled} onClick={() => onChange({ ogMediaId: undefined })}>
                Remover
              </button>
            )}
          </div>
          <p className="admin-muted">Ideal: 1200×630. A imagem publicada é reprocessada em WebP.</p>
        </div>
        <SearchPreview locale={locale} draft={draft} />
      </div>
      <MediaPicker
        open={picking}
        title="Imagem de compartilhamento"
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          onMediaPicked(picked);
          onChange({ ogMediaId: picked.id });
        }}
      />
    </details>
  );
}
