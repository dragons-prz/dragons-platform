import { useEffect, useRef } from "react";

import { CloseIcon } from "../components/icons";

/**
 * Dialogo de confirmacao acessivel (role="alertdialog", Escape fecha, foco
 * inicial no botao de cancelar para evitar exclusao acidental por Enter).
 * Usado pela exclusao de painel, que precisa de confirmacao explicita
 * citando o nome do painel.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>

        <p id="confirm-dialog-description" className="mt-2 font-body text-sm text-ink-muted">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 font-display text-sm font-semibold text-on-accent transition-colors ${
              destructive ? "bg-danger hover:bg-danger/85" : "bg-ember hover:bg-ember/85"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
