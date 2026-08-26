import type { PanelButtonStyle } from "@dragons/shared";

// Reaproveita as cores literais do Discord ja isoladas em discord-preview/colors.ts
// (a unica excecao a regra de "nunca hex solto" do painel) em vez de duplicar hex aqui.
import { buttonStyleColors } from "../discord-preview/colors";

const STYLE_OPTIONS: { value: PanelButtonStyle; label: string }[] = [
  { value: "Primary", label: "Azul" },
  { value: "Secondary", label: "Cinza" },
  { value: "Success", label: "Verde" },
  { value: "Danger", label: "Vermelho" }
];

/** Seletor do estilo (cor) de um botao, mostrando a cor real que o Discord usa para cada opcao. */
export function ButtonStyleSelect({
  value,
  onChange,
  idPrefix
}: {
  value: PanelButtonStyle;
  onChange: (style: PanelButtonStyle) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Estilo (cor) do botão">
      {STYLE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={`${idPrefix}-style-${option.value}`}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-body text-sm transition-colors ${
              isSelected
                ? "border-ink text-ink"
                : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
            }`}
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: buttonStyleColors[option.value].background }}
              aria-hidden="true"
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
