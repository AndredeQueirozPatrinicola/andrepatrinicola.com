import { useCallback, useId, useRef, useState, type ReactNode } from "react";

import { locales, type Locale } from "../../i18n/config";
import { ApiError, uploadToS3, useStudioApi, type StudioApi } from "./api";
import type { Media } from "./types";
import { ConfirmDialog, Dialog, EmptyState, ErrorState, Loading, errorMessage, formatBytes, localeLabel, usePagedList, useToast } from "./ui";

export const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const maxBytes = 10 * 1024 * 1024;

/** Checks done in the browser for quick feedback; the API checks the bytes again. */
export function validateFile(file: File): string | null {
  if (!acceptedTypes.includes(file.type)) return `${file.name}: use JPEG, PNG, WebP ou AVIF.`;
  if (file.size > maxBytes) return `${file.name}: maior que 10 MB.`;
  if (file.size === 0) return `${file.name}: arquivo vazio.`;
  return null;
}

export async function uploadImage(api: StudioApi, file: File): Promise<Media> {
  const { media, upload } = await api.media.createUpload({ filename: file.name, contentType: file.type, size: file.size });
  await uploadToS3(upload, file);
  return api.media.complete(media.id);
}

type Upload = { name: string; state: "uploading" | "done" | "error"; message?: string };

/** Uploads files one at a time and reports each one's progress. */
export function useUploads(onUploaded: (media: Media) => void) {
  const api = useStudioApi();
  const [uploads, setUploads] = useState<Upload[]>([]);

  const start = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files];
      setUploads(list.map((file) => ({ name: file.name, state: "uploading" })));
      for (const [index, file] of list.entries()) {
        const set = (upload: Upload) => setUploads((current) => current.map((item, position) => (position === index ? upload : item)));
        const invalid = validateFile(file);
        if (invalid) {
          set({ name: file.name, state: "error", message: invalid });
          continue;
        }
        try {
          onUploaded(await uploadImage(api, file));
          set({ name: file.name, state: "done" });
        } catch (error) {
          set({ name: file.name, state: "error", message: errorMessage(error) });
        }
      }
    },
    [api, onUploaded],
  );

  return { uploads, start, clear: () => setUploads([]) };
}

export function UploadButton({ onFiles, label = "Enviar imagens" }: { onFiles: (files: FileList) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <>
      <input
        id={id}
        ref={inputRef}
        className="visually-hidden"
        type="file"
        aria-label={label}
        tabIndex={-1}
        accept={acceptedTypes.join(",")}
        multiple
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <button type="button" className="admin-button" data-variant="primary" onClick={() => inputRef.current?.click()}>
        {label}
      </button>
    </>
  );
}

export function DropZone({ onFiles, children }: { onFiles: (files: FileList) => void; children: ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className="admin-dropzone"
      data-over={over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
      }}
    >
      {children}
    </div>
  );
}

export function UploadList({ uploads }: { uploads: Upload[] }) {
  if (!uploads.length) return null;
  return (
    <ul className="admin-uploads" aria-live="polite">
      {uploads.map((upload, index) => (
        <li key={`${upload.name}-${index}`} data-state={upload.state}>
          <span>{upload.name}</span>
          <span>{upload.state === "uploading" ? "Enviando…" : upload.state === "done" ? "Pronto" : upload.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function MediaThumb({ media }: { media: Media }) {
  return media.previewUrl ? (
    <img src={media.previewUrl} alt={media.alt.pt ?? ""} loading="lazy" width={media.width} height={media.height} />
  ) : (
    <span className="admin-thumb-missing">Sem prévia</span>
  );
}

type PickerProps = { open: boolean; onClose: () => void; onPick: (media: Media) => void; title?: string };

/** Choose an image from the library, or upload one. */
export function MediaPicker({ open, onClose, onPick, title = "Escolher imagem" }: PickerProps) {
  const api = useStudioApi();
  const list = usePagedList((cursor) => api.media.list(cursor), [api], open);
  const { uploads, start } = useUploads(useCallback((media: Media) => list.update((items) => [media, ...items]), [list]));
  const items = list.items;
  const error = list.error;

  return (
    <Dialog open={open} onClose={onClose} title={title} size="large">
      <DropZone onFiles={(files) => void start(files)}>
        <div className="admin-row">
          <UploadButton onFiles={(files) => void start(files)} />
          <span className="admin-muted">ou arraste arquivos para cá (JPEG, PNG, WebP, AVIF até 10 MB)</span>
        </div>
        <UploadList uploads={uploads} />
      </DropZone>
      {error ? <ErrorState error={error} onRetry={list.reload} /> : null}
      {open && items === null && !error && <Loading />}
      {items && items.length === 0 && <EmptyState title="A biblioteca está vazia." />}
      {items && items.length > 0 && (
        <ul className="admin-media-grid" data-compact>
          {items.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                className="admin-media-card"
                onClick={() => {
                  onPick(media);
                  onClose();
                }}
              >
                <MediaThumb media={media} />
                <span className="admin-media-name">{media.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.hasMore && (
        <button type="button" className="admin-button" onClick={() => void list.loadMore()} disabled={list.loadingMore}>
          Carregar mais
        </button>
      )}
    </Dialog>
  );
}

type EditProps = { media: Media | null; onClose: () => void; onSaved: (media: Media) => void; onDeleted: (id: string) => void };

export function MediaEditDialog({ media, onClose, onSaved, onDeleted }: EditProps) {
  const api = useStudioApi();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [alt, setAlt] = useState<Partial<Record<Locale, string>>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (media && loadedId !== media.id) {
    setLoadedId(media.id);
    setName(media.name);
    setAlt(media.alt);
  }

  async function save() {
    if (!media) return;
    setBusy(true);
    try {
      onSaved(await api.media.update(media.id, { name, alt }));
      notify("success", "Imagem atualizada.");
      onClose();
    } catch (error) {
      notify("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!media) return;
    setBusy(true);
    try {
      await api.media.remove(media.id);
      onDeleted(media.id);
      notify("success", "Imagem excluída.");
      setConfirmDelete(false);
      onClose();
    } catch (error) {
      setConfirmDelete(false);
      notify(
        "error",
        error instanceof ApiError && error.code === "in_use"
          ? "A imagem está em uso por artigos (rascunho ou publicado). Remova-a deles antes de excluir."
          : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={Boolean(media) && !confirmDelete} onClose={onClose} title="Detalhes da imagem" size="large">
        {media && (
          <form
            className="admin-media-edit"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="admin-media-edit-preview">
              <MediaThumb media={media} />
              <dl className="admin-facts">
                <div>
                  <dt>Arquivo</dt>
                  <dd>{media.filename}</dd>
                </div>
                <div>
                  <dt>Dimensões</dt>
                  <dd>
                    {media.width}×{media.height}
                  </dd>
                </div>
                <div>
                  <dt>Tamanho</dt>
                  <dd>{formatBytes(media.size)}</dd>
                </div>
              </dl>
            </div>
            <div className="admin-fields">
              <label className="admin-field">
                <span className="label">Nome</span>
                <input value={name} maxLength={120} required onChange={(event) => setName(event.target.value)} />
              </label>
              {locales.map((locale) => (
                <label key={locale} className="admin-field">
                  <span className="label">Texto alternativo · {localeLabel[locale]}</span>
                  <input
                    value={alt[locale] ?? ""}
                    maxLength={300}
                    lang={locale}
                    onChange={(event) => setAlt((current) => ({ ...current, [locale]: event.target.value }))}
                  />
                </label>
              ))}
              <p className="admin-muted">
                O texto alternativo descreve a imagem para leitores de tela. No artigo, o texto definido na própria imagem tem
                prioridade.
              </p>
            </div>
            <div className="admin-dialog-actions">
              <button type="button" className="admin-button" data-variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Excluir
              </button>
              <button type="submit" className="admin-button" data-variant="primary" disabled={busy} aria-busy={busy}>
                Salvar
              </button>
            </div>
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir imagem?"
        message="A imagem só pode ser excluída se nenhum artigo (rascunho ou publicado) a usar. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
