import { useCallback, useState } from "react";

import { useStudioApi } from "../../features/admin/api";
import { PageHeader } from "../../features/admin/AdminShell";
import { DropZone, MediaEditDialog, MediaThumb, UploadButton, UploadList, useUploads } from "../../features/admin/media";
import type { Media } from "../../features/admin/types";
import { EmptyState, ErrorState, Loading, formatBytes, usePagedList } from "../../features/admin/ui";
import { rememberMedia } from "../../features/admin/useMediaPreviews";

export function meta() {
  return [{ title: "Mídia · Portfolio Studio" }];
}

export default function MediaRoute() {
  const api = useStudioApi();
  const [editing, setEditing] = useState<Media | null>(null);
  const list = usePagedList(
    async (cursor) => {
      const page = await api.media.list(cursor);
      page.items.forEach(rememberMedia);
      return page;
    },
    [api],
  );
  const items = list.items;
  const { update } = list;

  const { uploads, start } = useUploads(
    useCallback(
      (media: Media) => {
        rememberMedia(media);
        update((current) => [media, ...current]);
      },
      [update],
    ),
  );

  return (
    <>
      <PageHeader
        title="Mídia"
        description="Originais ficam privados; o site publica cópias WebP reprocessadas só das imagens usadas em artigos publicados."
        actions={<UploadButton onFiles={(files) => void start(files)} />}
      />
      <DropZone onFiles={(files) => void start(files)}>
        <p className="admin-muted">Arraste imagens para cá · JPEG, PNG, WebP ou AVIF · até 10 MB · SVG não é aceito</p>
        <UploadList uploads={uploads} />
      </DropZone>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {items === null && !list.error && <Loading />}
      {items && items.length === 0 && <EmptyState title="Nenhuma imagem ainda." />}
      {items && items.length > 0 && (
        <ul className="admin-media-grid">
          {items.map((media) => (
            <li key={media.id}>
              <button type="button" className="admin-media-card" onClick={() => setEditing(media)}>
                <MediaThumb media={media} />
                <span className="admin-media-name">{media.name}</span>
                <span className="admin-muted">
                  {media.width}×{media.height} · {formatBytes(media.size)}
                  {!media.alt.pt && !media.alt.en && !media.alt.es && " · sem texto alternativo"}
                </span>
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
      <MediaEditDialog
        media={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          rememberMedia(updated);
          update((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        }}
        onDeleted={(id) => update((current) => current.filter((item) => item.id !== id))}
      />
    </>
  );
}
