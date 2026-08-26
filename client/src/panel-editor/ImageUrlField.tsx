import { isEphemeralDiscordAttachmentUrl } from "@dragons/shared";
import { useId } from "react";

import { WarningIcon } from "../components/icons";

/**
 * Campo de URL de imagem do painel (colavel, sem upload — decisao tomada
 * para esta fase). Detecta links de anexo do Discord, que expiram em ~24h,
 * e mostra um aviso destacado sugerindo um host permanente.
 */
export function ImageUrlField({
  value,
  onChange,
  error,
  label = "URL da imagem (opcional)"
}: {
  value: string;
  onChange: (next: string) => void;
  error: string | null;
  label?: string;
}) {
  const fieldId = useId();
  const showEphemeralWarning = value.trim().length > 0 && isEphemeralDiscordAttachmentUrl(value);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="font-body text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        inputMode="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://..."
        className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
        aria-invalid={Boolean(error)}
        aria-describedby={showEphemeralWarning ? `${fieldId}-ephemeral-warning` : undefined}
      />
      {error ? <p className="font-body text-xs text-danger">{error}</p> : null}
      {showEphemeralWarning ? (
        <div
          id={`${fieldId}-ephemeral-warning`}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warn/50 bg-warn/10 px-3 py-2"
        >
          <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p className="font-body text-xs text-ink">
            Este é um link de anexo do Discord — ele expira em cerca de 24 horas e a imagem vai
            sumir do painel depois disso. Use um host permanente (ex.: um CDN de imagens) em vez
            deste link.
          </p>
        </div>
      ) : null}
    </div>
  );
}
