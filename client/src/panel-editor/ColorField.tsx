import { HEX_COLOR_PATTERN } from "@dragons/shared";
import { useId } from "react";

/**
 * Atalhos de cor derivados dos tokens de `client/src/index.css`
 * (`--ember`, `--ok`, `--warn`, `--danger`). O valor persistido precisa ser
 * um hex literal (formato exigido pelo contrato do painel/bot), mas a
 * amostra visual usa a custom property via `var(...)` para nunca desalinhar
 * do token caso ele mude.
 */
const QUICK_COLORS: { label: string; hex: string; swatchVar: string }[] = [
  { label: "Ember", hex: "#E03131", swatchVar: "var(--ember)" },
  { label: "Ok", hex: "#2F9E44", swatchVar: "var(--ok)" },
  { label: "Aviso", hex: "#F08C00", swatchVar: "var(--warn)" },
  { label: "Perigo", hex: "#C92A2A", swatchVar: "var(--danger)" }
];

/**
 * Campo de cor (barra lateral do embed): `<input type="color">` nativo
 * sincronizado com um campo de texto hex, atalhos rapidos e uma opcao
 * "sem cor" (volta para `null`, representado aqui como string vazia).
 */
export function ColorField({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error: string | null;
}) {
  const fieldId = useId();
  const trimmed = value.trim();
  const isValidHex = HEX_COLOR_PATTERN.test(trimmed);
  // O input nativo exige sempre um valor hex de 7 caracteres válido.
  const pickerValue = isValidHex ? trimmed : "#2b2d31";

  return (
    <div className="flex flex-col gap-1">
      <span id={`${fieldId}-label`} className="font-body text-xs font-medium text-ink-muted">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-labelledby={`${fieldId}-label`}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line bg-ground p-0.5"
        />
        <input
          id={fieldId}
          type="text"
          inputMode="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#E03131"
          maxLength={7}
          className="w-28 rounded-lg border border-line bg-ground px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-ember"
          aria-invalid={Boolean(error)}
        />
        <div className="flex items-center gap-1" role="group" aria-label="Cores rápidas">
          {QUICK_COLORS.map((quick) => (
            <button
              key={quick.hex}
              type="button"
              title={quick.label}
              onClick={() => onChange(quick.hex)}
              className={`h-7 w-7 shrink-0 rounded-full border-2 transition-colors ${
                trimmed.toUpperCase() === quick.hex ? "border-ink" : "border-transparent"
              }`}
              style={{ backgroundColor: quick.swatchVar }}
            >
              <span className="sr-only">Usar cor {quick.label}</span>
            </button>
          ))}
          <button
            type="button"
            title="Sem cor"
            onClick={() => onChange("")}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-surface-2 font-body text-[10px] text-ink-muted transition-colors ${
              trimmed.length === 0 ? "border-ink" : "border-transparent"
            }`}
          >
            ×
          </button>
        </div>
      </div>
      {error ? <p className="font-body text-xs text-danger">{error}</p> : null}
    </div>
  );
}
