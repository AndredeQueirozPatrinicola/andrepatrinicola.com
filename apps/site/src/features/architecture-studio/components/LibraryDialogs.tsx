import { useState } from "react";

import { localeInfo, type Locale } from "../../../i18n/config";
import { fill, type TemplateId } from "../messages";
import type { Library, ListResult } from "../persistence/library";
import { templates } from "../templates";
import { ConfirmDialog, Dialog } from "./Dialog";
import { useStudio } from "./StudioContext";

/** Local date and time of a save (client-only: never pre-rendered). */
function formatSaved(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeInfo[locale].tag, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

type LibraryProps = {
  open: boolean;
  library: Library;
  currentId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string, title: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

/** "My diagrams": everything saved in this browser. */
export function LibraryDialog({ open, library, currentId, onClose, onOpen, onDuplicate, onRename, onDelete }: LibraryProps) {
  const { locale, text } = useStudio();
  const t = text.dialogs.library;
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  // Re-read on every render while open: the list is small and always current.
  const result: ListResult = open ? library.list() : { ok: true, entries: [] };

  return (
    <>
      <Dialog open={open && !deleting} title={t.title} onClose={onClose}>
        <p className="studio-hint">{t.intro}</p>
        {!result.ok && <p role="alert">{t.unavailable}</p>}
        {result.ok && result.entries.length === 0 && <p>{t.empty}</p>}
        {result.ok && result.entries.length > 0 && (
          <ul className="studio-library">
            {result.entries.map((entry) =>
              entry.status === "corrupt" ? (
                <li key={entry.id} data-status="corrupt">
                  <div>
                    <strong>{t.corrupt}</strong>
                    <p className="studio-hint">{t.corruptHint}</p>
                  </div>
                  <div className="studio-library-actions">
                    <button type="button" className="studio-button" data-variant="danger" onClick={() => setDeleting({ id: entry.id, title: entry.id })}>
                      {t.delete}
                    </button>
                  </div>
                </li>
              ) : (
                <li key={entry.id}>
                  {renaming?.id === entry.id ? (
                    <form
                      className="studio-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const title = renaming.title.trim();
                        if (title) onRename(entry.id, title);
                        setRenaming(null);
                      }}
                    >
                      <label>
                        <span className="visually-hidden">{t.renameLabel}</span>
                        <input
                          type="text"
                          value={renaming.title}
                          maxLength={120}
                          autoFocus
                          onChange={(event) => setRenaming({ id: entry.id, title: event.target.value })}
                        />
                      </label>
                      <button type="submit" className="studio-button">
                        {t.saveName}
                      </button>
                    </form>
                  ) : (
                    <div>
                      <strong>{entry.title}</strong>
                      {entry.id === currentId && <span className="studio-badge">{t.current}</span>}
                      <p className="studio-hint">
                        {fill(t.updated, { date: formatSaved(entry.updatedAt, locale) })} · {fill(t.count, { count: entry.nodeCount })}
                      </p>
                    </div>
                  )}
                  <div className="studio-library-actions">
                    <button type="button" className="studio-button" data-variant="primary" onClick={() => onOpen(entry.id)} aria-label={`${t.open}: ${entry.title}`}>
                      {t.open}
                    </button>
                    <button
                      type="button"
                      className="studio-button"
                      onClick={() => onDuplicate(entry.id, fill(t.copyTitle, { title: entry.title }))}
                      aria-label={`${t.duplicate}: ${entry.title}`}
                    >
                      {t.duplicate}
                    </button>
                    <button
                      type="button"
                      className="studio-button"
                      onClick={() => setRenaming({ id: entry.id, title: entry.title })}
                      aria-label={`${t.rename}: ${entry.title}`}
                    >
                      {t.rename}
                    </button>
                    <button
                      type="button"
                      className="studio-button"
                      data-variant="danger"
                      onClick={() => setDeleting({ id: entry.id, title: entry.title })}
                      aria-label={`${t.delete}: ${entry.title}`}
                    >
                      {t.delete}
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title={text.dialogs.confirmDelete.title}
        message={fill(text.dialogs.confirmDelete.body, { title: deleting?.title ?? "" })}
        confirmLabel={text.dialogs.confirmDelete.confirm}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDelete(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}

export function TemplateDialog({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (id: TemplateId) => void }) {
  const { text } = useStudio();
  return (
    <Dialog open={open} title={text.dialogs.templates.title} onClose={onClose}>
      <p className="studio-hint">{text.dialogs.templates.intro}</p>
      <ul className="studio-template-list">
        {templates.map((template) => {
          const summary = text.templates[template.id];
          return (
            <li key={template.id}>
              <span className="label">{summary.category}</span>
              <strong>{summary.title}</strong>
              <p>{summary.description}</p>
              <button type="button" className="studio-button" onClick={() => onOpen(template.id)} aria-label={`${text.dialogs.templates.open}: ${summary.title}`}>
                {text.dialogs.templates.open}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

export function ErrorDialog({ open, title, message, onClose }: { open: boolean; title: string; message: string; onClose: () => void }) {
  const { text } = useStudio();
  return (
    <Dialog open={open} title={title} onClose={onClose} role="alertdialog">
      <p>{message}</p>
      <div className="studio-dialog-actions">
        <button type="button" className="studio-button" data-variant="primary" onClick={onClose} autoFocus>
          {text.dialogs.close}
        </button>
      </div>
    </Dialog>
  );
}
