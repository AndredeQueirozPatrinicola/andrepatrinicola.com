import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router";

import { onBeforeSignInRedirect } from "../../../auth/AuthProvider";
import { ArticleContent } from "../../blog/ArticleContent";
import { locales, type Locale } from "../../../i18n/config";
import { useStudioApi, type LocaleDraftInput } from "../api";
import { RichTextEditor } from "../editor/RichTextEditor";
import { MediaPicker } from "../media";
import type { Article, Media } from "../types";
import { ConfirmDialog, Dialog, StatusBadge, articleStatusLabel, formatDateTime, localeLabel, typeLabel, useToast } from "../ui";
import { previewImages, previewUrls, rememberMedia, useMediaPreviews } from "../useMediaPreviews";
import { mediaIdsOfDoc } from "./documents";
import { PublishPanel } from "./PublishPanel";
import { RevisionsPanel } from "./RevisionsPanel";
import { SeoPanel } from "./SeoPanel";
import { SettingsPanel } from "./SettingsPanel";
import {
  isValidSlug,
  missingForReady,
  newLocaleDraft,
  readBackup,
  slugify,
  useArticleDraft,
  type ArticleDraft,
} from "./useArticleDraft";

const fieldLabels: Record<string, string> = { title: "Título", slug: "Slug", excerpt: "Resumo", content: "Corpo" };

function SaveIndicator({ draft }: { draft: ArticleDraft }) {
  const text = {
    saved: draft.savedAt ? `Salvo às ${new Date(draft.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Tudo salvo",
    dirty: "Alterações não salvas",
    saving: "Salvando…",
    error: draft.error?.status === 401 ? "Sessão expirada: alterações guardadas nesta aba" : "Não foi possível salvar",
    conflict: "Conflito com outra sessão",
  }[draft.status];
  return (
    <span className="admin-save" data-status={draft.status} role="status" aria-live="polite">
      {text}
      {draft.status === "error" && draft.error?.status !== 401 && (
        <button type="button" className="admin-link-button" onClick={() => void draft.save()}>
          Tentar de novo
        </button>
      )}
    </span>
  );
}

function useSlugCheck(articleId: string, locale: Locale, slug: string) {
  const api = useStudioApi();
  const [result, setResult] = useState<{ key: string; state: "idle" | "available" | "taken" } | null>(null);
  const key = `${locale}/${slug}`;
  const valid = isValidSlug(slug);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.slugs.check(locale, slug, articleId, controller.signal).then(
        (answer) => setResult({ key, state: answer.available ? "available" : "taken" }),
        () => setResult({ key, state: "idle" }),
      );
    }, 500);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [api, articleId, locale, slug, key, valid]);

  if (!valid) return "idle";
  return result?.key === key ? result.state : "checking";
}

type LocaleFieldsProps = {
  article: Article;
  locale: Locale;
  draft: LocaleDraftInput;
  onChange: (change: Partial<LocaleDraftInput>) => void;
  disabled: boolean;
  serverFields: string[];
};

function LocaleFields({ article, locale, draft, onChange, disabled, serverFields }: LocaleFieldsProps) {
  const id = useId();
  const published = Boolean(article.live?.slugs[locale]);
  // The slug follows the title until it is edited by hand (or was ever published).
  const [slugTouched, setSlugTouched] = useState(() => published || (draft.slug !== "" && draft.slug !== slugify(draft.title)));
  const slugState = useSlugCheck(article.id, locale, draft.slug);
  const missing = missingForReady(draft);
  const invalid = (field: string) => serverFields.includes(`locales.${locale}.${field}`) || undefined;

  return (
    <div className="admin-fields">
      <label className="admin-field" htmlFor={`${id}-title`}>
        <span className="label">Título</span>
        <input
          id={`${id}-title`}
          className="admin-title-input"
          value={draft.title}
          maxLength={160}
          disabled={disabled}
          lang={locale}
          aria-invalid={invalid("title")}
          onChange={(event) => {
            const title = event.target.value;
            onChange(slugTouched ? { title } : { title, slug: slugify(title) });
          }}
        />
      </label>

      <div className="admin-field">
        <label className="label" htmlFor={`${id}-slug`}>
          Slug
        </label>
        <div className="admin-slug">
          <span className="admin-muted">/{locale}/blog/</span>
          <input
            id={`${id}-slug`}
            value={draft.slug}
            maxLength={96}
            disabled={disabled}
            aria-invalid={(draft.slug !== "" && !isValidSlug(draft.slug)) || slugState === "taken" || invalid("slug")}
            aria-describedby={`${id}-slug-help`}
            onChange={(event) => {
              setSlugTouched(true);
              onChange({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-") });
            }}
          />
        </div>
        <p id={`${id}-slug-help`} className="admin-help" data-state={slugState}>
          {draft.slug !== "" && !isValidSlug(draft.slug)
            ? "Use letras minúsculas, números e hífens."
            : slugState === "taken"
              ? "Já usado por outro artigo publicado neste idioma."
              : slugState === "available"
                ? "Disponível."
                : published && article.live?.slugs[locale] !== draft.slug
                  ? "Ao publicar, o endereço antigo redireciona para o novo."
                  : " "}
        </p>
      </div>

      <label className="admin-field" htmlFor={`${id}-excerpt`}>
        <span className="label">
          Resumo <span className="admin-counter">{draft.excerpt.length}/400</span>
        </span>
        <textarea
          id={`${id}-excerpt`}
          rows={3}
          value={draft.excerpt}
          maxLength={400}
          disabled={disabled}
          lang={locale}
          aria-invalid={invalid("excerpt")}
          onChange={(event) => onChange({ excerpt: event.target.value })}
        />
      </label>

      <div className="admin-ready">
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.translationStatus === "ready"}
            disabled={disabled || (draft.translationStatus !== "ready" && missing.length > 0)}
            onChange={(event) => onChange({ translationStatus: event.target.checked ? "ready" : "draft" })}
          />
          <span>Versão em {localeLabel[locale]} pronta para publicar</span>
        </label>
        {draft.translationStatus !== "ready" && missing.length > 0 && (
          <p className="admin-muted">Falta: {missing.map((field) => fieldLabels[field]).join(", ")}.</p>
        )}
      </div>
    </div>
  );
}

function LeaveGuard({ draft }: { draft: ArticleDraft }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => draft.hasUnsaved() && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!draft.hasUnsaved()) return;
      draft.backupNow();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft]);

  return (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      title="Sair sem salvar?"
      message="Há alterações que ainda não foram salvas. Elas ficam guardadas nesta aba, mas não no servidor."
      confirmLabel="Sair mesmo assim"
      tone="danger"
      onConfirm={() => {
        draft.backupNow();
        blocker.proceed?.();
      }}
      onCancel={() => blocker.reset?.()}
    />
  );
}

export function ArticleEditor({ initial }: { initial: Article }) {
  const api = useStudioApi();
  const { notify } = useToast();
  const draft = useArticleDraft(api, initial);
  const [active, setActive] = useState<Locale>(() => locales.find((locale) => initial.locales[locale]) ?? "pt");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [backup, setBackup] = useState(() => readBackup(initial.id));
  const pickResolver = useRef<((media: Media | null) => void) | null>(null);
  const [picking, setPicking] = useState(false);
  const archived = draft.server.status === "archived";

  useEffect(() => onBeforeSignInRedirect(draft.backupNow), [draft.backupNow]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void draft.save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  useEffect(() => {
    for (const warning of draft.warnings) {
      notify("info", `O slug em ${warning.locale.toUpperCase()} já pertence a outro artigo publicado; troque-o antes de publicar.`);
    }
  }, [draft.warnings, notify]);

  const current = draft.drafts[active];
  const referenced = useMemo(() => {
    const ids = new Set<string>();
    if (draft.meta.coverMediaId) ids.add(draft.meta.coverMediaId);
    for (const locale of locales) {
      const item = draft.drafts[locale];
      if (!item) continue;
      if (item.ogMediaId) ids.add(item.ogMediaId);
      for (const id of mediaIdsOfDoc(item.content)) ids.add(id);
    }
    return [...ids];
  }, [draft.meta.coverMediaId, draft.drafts]);
  const media = useMediaPreviews(api, referenced);

  const pickImage = useCallback(
    () =>
      new Promise<{ id: string; alt: string } | null>((resolve) => {
        pickResolver.current = (picked) => resolve(picked ? { id: picked.id, alt: picked.alt[active] ?? "" } : null);
        setPicking(true);
      }),
    [active],
  );

  const serverFields = draft.error?.fields ?? [];

  return (
    <div className="admin-editor">
      <header className="admin-page-head">
        <div>
          <p className="admin-muted">
            {typeLabel[draft.meta.type]} · <StatusBadge status={draft.server.status} label={articleStatusLabel[draft.server.status]} /> · editado{" "}
            {formatDateTime(draft.server.updatedAt)} por {draft.server.updatedBy}
          </p>
          <h1>{current?.title || "Sem título"}</h1>
        </div>
        <div className="admin-page-actions">
          <SaveIndicator draft={draft} />
          <button type="button" className="admin-button" onClick={() => setMode(mode === "edit" ? "preview" : "edit")} aria-pressed={mode === "preview"}>
            {mode === "edit" ? "Pré-visualizar" : "Voltar a editar"}
          </button>
          <button type="button" className="admin-button" data-variant="primary" disabled={draft.status === "saved" || draft.status === "saving"} onClick={() => void draft.save()}>
            Salvar
          </button>
        </div>
      </header>

      {archived && <p className="admin-warning">Artigo arquivado: restaure-o para rascunho para editar.</p>}

      {backup && (
        <div className="admin-banner" role="alert">
          <p>
            Há alterações desta aba que não chegaram ao servidor ({formatDateTime(backup.savedAt)}).
            {backup.version !== initial.version && " O artigo mudou desde então; ao salvar, você poderá escolher qual versão manter."}
          </p>
          <div className="admin-row">
            <button
              type="button"
              className="admin-button"
              data-variant="primary"
              onClick={() => {
                draft.restoreBackup(backup);
                setBackup(null);
              }}
            >
              Recuperar alterações
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() => {
                draft.discardBackup();
                setBackup(null);
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="admin-tabs" role="tablist" aria-label="Idioma">
        {locales.map((locale) => {
          const item = draft.drafts[locale];
          const state = !item ? "missing" : item.translationStatus;
          return (
            <button
              key={locale}
              type="button"
              role="tab"
              id={`tab-${locale}`}
              aria-selected={locale === active}
              aria-controls="locale-panel"
              className="admin-tab"
              data-state={state}
              onClick={() => setActive(locale)}
            >
              {localeLabel[locale]}
              <span className="admin-tab-state">
                {state === "missing" ? "—" : state === "ready" ? "pronto" : "rascunho"}
                {draft.server.live?.slugs[locale] ? " · no ar" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-editor-layout">
        <div id="locale-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="admin-editor-main">
          {!current ? (
            <div className="admin-empty">
              <p className="admin-empty-title">Ainda não há versão em {localeLabel[active]}.</p>
              <p className="admin-muted">Cada idioma tem título, slug, resumo e corpo próprios. Nada é traduzido automaticamente.</p>
              <button type="button" className="admin-button" data-variant="primary" disabled={archived} onClick={() => draft.updateLocale(active, newLocaleDraft())}>
                Criar versão em {localeLabel[active]}
              </button>
            </div>
          ) : mode === "preview" ? (
            <article className="admin-preview" lang={active}>
              <p className="admin-muted">Pré-visualização · {localeLabel[active]} · não publicado</p>
              <h1>{current.title || "Sem título"}</h1>
              {current.excerpt && <p className="admin-preview-lead">{current.excerpt}</p>}
              <ArticleContent content={current.content} images={previewImages(media, active)} />
            </article>
          ) : (
            <>
              <LocaleFields
                key={`${active}-${draft.revision}`}
                article={draft.server}
                locale={active}
                draft={current}
                disabled={archived}
                serverFields={serverFields}
                onChange={(change) => draft.updateLocale(active, change)}
              />
              <RichTextEditor
                key={`editor-${active}-${draft.revision}`}
                label={`Corpo do artigo em ${localeLabel[active]}`}
                value={current.content}
                readOnly={archived}
                previews={previewUrls(media)}
                pickImage={pickImage}
                onChange={(content) => draft.updateLocale(active, { content })}
              />
            </>
          )}
        </div>

        <aside className="admin-editor-side" aria-label="Publicação e configurações">
          <PublishPanel draft={draft} />
          <SettingsPanel
            meta={draft.meta}
            media={media}
            disabled={archived}
            onChange={draft.updateMeta}
            onMediaPicked={rememberMedia}
          />
          {current && (
            <SeoPanel
              locale={active}
              draft={current}
              media={media}
              disabled={archived}
              onChange={(change) => draft.updateLocale(active, change)}
              onMediaPicked={rememberMedia}
            />
          )}
          <RevisionsPanel draft={draft} />
        </aside>
      </div>

      <MediaPicker
        open={picking}
        onClose={() => {
          setPicking(false);
          pickResolver.current?.(null);
          pickResolver.current = null;
        }}
        onPick={(picked) => {
          rememberMedia(picked);
          pickResolver.current?.(picked);
          pickResolver.current = null;
        }}
      />

      <Dialog open={draft.status === "conflict"} title="Este artigo mudou em outro lugar" onClose={() => undefined}>
        <div className="admin-dialog-content">
          <p>
            Outra aba ou sessão salvou uma versão mais nova. Suas alterações estão guardadas nesta aba. Escolha qual versão manter.
          </p>
        </div>
        <div className="admin-dialog-actions">
          <button type="button" className="admin-button" onClick={() => void draft.resolveConflict("theirs")}>
            Usar a versão do servidor
          </button>
          <button type="button" className="admin-button" data-variant="primary" onClick={() => void draft.resolveConflict("mine")}>
            Manter as minhas alterações
          </button>
        </div>
      </Dialog>

      <LeaveGuard draft={draft} />
    </div>
  );
}
