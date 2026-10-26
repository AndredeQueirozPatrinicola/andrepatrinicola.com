import { useEffect, useId, useRef, type ReactNode } from "react";

import { useStudio } from "./StudioContext";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
};

/**
 * Native modal <dialog>: the browser traps focus, closes on Esc, puts it on
 * the top layer and gives focus back to the opener when it closes.
 */
export function Dialog({ open, title, onClose, children, role = "dialog" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { text } = useStudio();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="studio-dialog-body">
          <header className="studio-dialog-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="studio-icon-button" aria-label={text.dialogs.close} title={text.dialogs.close} onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

type ConfirmProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  const { text } = useStudio();
  return (
    <Dialog open={open} title={title} onClose={onCancel} role="alertdialog">
      <p>{message}</p>
      <div className="studio-dialog-actions">
        <button type="button" className="studio-button" onClick={onCancel} autoFocus>
          {text.dialogs.cancel}
        </button>
        <button type="button" className="studio-button" data-variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
