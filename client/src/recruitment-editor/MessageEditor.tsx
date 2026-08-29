import type { PanelLayout, RecruitmentMessageConfig } from "@dragons/shared";
import { PANEL_LIMITS, RECRUITMENT_TEMPLATE_VARIABLES } from "@dragons/shared";
import { useRef } from "react";

import { CharacterCounter } from "../panel-editor/CharacterCounter";
import { ColorField } from "../panel-editor/ColorField";
import { EmojiPicker } from "../panel-editor/EmojiPicker";
import { ImageUrlField } from "../panel-editor/ImageUrlField";
import { useCursorInsert } from "../panel-editor/useCursorInsert";

const LAYOUT_OPTIONS: { value: PanelLayout; label: string; hint: string }[] = [
  {
    value: "container",
    label: "Container",
    hint: "Components V2 — emoji do servidor funciona no título e a imagem vira banner no topo."
  },
  {
    value: "embed",
    label: "Embed",
    hint: "Formato clássico — a imagem fica embaixo e o título não renderiza emoji customizado."
  }
];

/**
 * Editor de uma mensagem do fluxo de recrutamento — o mesmo modelo das
 * mensagens de painel (layout embed/container + titulo + descricao + cor +
 * imagem), com insercao de emoji do servidor e das variaveis de template.
 */
export function MessageEditor({
  message,
  onChange
}: {
  message: RecruitmentMessageConfig;
  onChange: (next: RecruitmentMessageConfig) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const insertInTitle = useCursorInsert(titleRef, message.title, (title) =>
    onChange({ ...message, title })
  );
  const insertInDescription = useCursorInsert(descriptionRef, message.description, (description) =>
    onChange({ ...message, description })
  );

  const selectedLayout = LAYOUT_OPTIONS.find((option) => option.value === message.layout);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-body text-xs font-medium text-ink-muted">Formato da mensagem</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Formato da mensagem">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={message.layout === option.value}
              onClick={() => onChange({ ...message, layout: option.value })}
              className={`rounded-lg border px-3 py-1.5 font-body text-sm transition-colors ${
                message.layout === option.value
                  ? "border-ink text-ink"
                  : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {selectedLayout ? (
          <p className="font-body text-xs text-ink-muted">{selectedLayout.hint}</p>
        ) : null}
      </div>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between font-body text-xs font-medium text-ink-muted">
          Título
          <CharacterCounter current={message.title.length} max={PANEL_LIMITS.TITLE_MAX} />
        </span>
        <div className="flex items-start gap-2">
          <input
            ref={titleRef}
            type="text"
            value={message.title}
            onChange={(event) => onChange({ ...message, title: event.target.value })}
            className="flex-1 rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          />
          <EmojiPicker label="Inserir emoji no título" onSelect={insertInTitle} />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between font-body text-xs font-medium text-ink-muted">
          Texto
          <CharacterCounter
            current={message.description.length}
            max={PANEL_LIMITS.DESCRIPTION_MAX}
          />
        </span>
        <div className="flex items-start gap-2">
          <textarea
            ref={descriptionRef}
            value={message.description}
            rows={6}
            onChange={(event) => onChange({ ...message, description: event.target.value })}
            className="flex-1 resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          />
          <EmojiPicker label="Inserir emoji no texto" onSelect={insertInDescription} />
        </div>
      </label>

      <VariableHelp onInsert={insertInDescription} />

      <ColorField
        label="Cor da barra lateral"
        value={message.color ?? ""}
        onChange={(next) => onChange({ ...message, color: next.trim() === "" ? null : next })}
        error={null}
      />

      <ImageUrlField
        label="URL da imagem (opcional)"
        value={message.imageUrl ?? ""}
        onChange={(next) => onChange({ ...message, imageUrl: next.trim() === "" ? null : next })}
        error={null}
      />
    </div>
  );
}

/** Lista clicavel das variaveis aceitas — insere `{chave}` no cursor do texto. */
function VariableHelp({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-xs font-medium text-ink-muted">
        Variáveis (clique para inserir no texto)
      </span>
      <div className="flex flex-wrap gap-1">
        {RECRUITMENT_TEMPLATE_VARIABLES.map((variable) => (
          <button
            key={variable.key}
            type="button"
            title={variable.help}
            onClick={() => onInsert(`{${variable.key}}`)}
            className="rounded border border-line px-2 py-1 font-mono text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
          >
            {`{${variable.key}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
