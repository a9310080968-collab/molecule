import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, Trash2, X } from "lucide-react";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="modal-backdrop confirm-dialog-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <article className="confirm-dialog glass-panel">
        <header>
          <span><TriangleAlert size={19} /></span>
          <div>
            <h2 id="confirm-dialog-title">{title}</h2>
            <p id="confirm-dialog-description">{description}</p>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="Закрыть подтверждение">
            <X size={18} />
          </button>
        </header>
        <footer>
          <button ref={cancelButtonRef} onClick={onCancel}>Отмена</button>
          <button className="danger-action" onClick={onConfirm}>
            <Trash2 size={16} />
            {confirmLabel}
          </button>
        </footer>
      </article>
    </div>,
    document.body,
  );
}
