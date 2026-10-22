import { useId, useState } from "react";

import { MediaPicker, MediaThumb } from "../media";
import type { Media } from "../types";
import { typeLabel } from "../ui";
import type { ArticleMetaDraft } from "./useArticleDraft";

const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

type Props = {
  meta: ArticleMetaDraft;
  media: Record<string, Media>;
  onChange: (change: Partial<ArticleMetaDraft>) => void;
  onMediaPicked: (media: Media) => void;
  disabled: boolean;
};

export function SettingsPanel({ meta, media, onChange, onMediaPicked, disabled }: Props) {
  const id = useId();
  const [tag, setTag] = useState("");
  const [picking, setPicking] = useState(false);
  const cover = meta.coverMediaId ? media[meta.coverMediaId] : undefined;

  function addTag() {
    const value = normalizeTag(tag);
    setTag("");
    if (!value || !tagPattern.test(value) || meta.tags.includes(value) || meta.tags.length >= 10) return;
    onChange({ tags: [...meta.tags, value] });
  }

  return (
    <details className="admin-panel" open>
      <summary className="admin-panel-title">Artigo</summary>
      <div className="admin-fields">
        <label className="admin-field" htmlFor={`${id}-type`}>
          <span className="label">Tipo</span>
          <select
            id={`${id}-type`}
            value={meta.type}
            disabled={disabled}
            onChange={(event) => onChange({ type: event.target.value as ArticleMetaDraft["type"] })}
          >
            <option value="article">{typeLabel.article}</option>
            <option value="build_log">{typeLabel.build_log}</option>
          </select>
        </label>

        <div className="admin-field">
          <label className="label" htmlFor={`${id}-tag`}>
            Tags ({meta.tags.length}/10)
          </label>
          {meta.tags.length > 0 && (
            <ul className="admin-tags">
              {meta.tags.map((item) => (
                <li key={item}>
                  {item}
                  <button
                    type="button"
                    className="admin-icon-button"
                    aria-label={`Remover tag ${item}`}
                    disabled={disabled}
                    onClick={() => onChange({ tags: meta.tags.filter((other) => other !== item) })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="admin-row">
            <input
              id={`${id}-tag`}
              value={tag}
              disabled={disabled || meta.tags.length >= 10}
              placeholder="ex.: aws, serverless"
              onChange={(event) => setTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className="admin-button" data-size="small" disabled={disabled || !tag.trim()} onClick={addTag}>
              Adicionar
            </button>
          </div>
        </div>

        <div className="admin-field">
          <span className="label">Capa</span>
          {cover ? <div className="admin-cover"><MediaThumb media={cover} /></div> : <p className="admin-muted">Sem capa.</p>}
          <div className="admin-row">
            <button type="button" className="admin-button" data-size="small" disabled={disabled} onClick={() => setPicking(true)}>
              {meta.coverMediaId ? "Trocar capa" : "Escolher capa"}
            </button>
            {meta.coverMediaId && (
              <button type="button" className="admin-button" data-size="small" disabled={disabled} onClick={() => onChange({ coverMediaId: null })}>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      <MediaPicker
        open={picking}
        title="Capa do artigo"
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          onMediaPicked(picked);
          onChange({ coverMediaId: picked.id });
        }}
      />
    </details>
  );
}
