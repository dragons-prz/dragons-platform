import type { RecruitmentButtonConfig } from "@dragons/shared";
import { PANEL_LIMITS } from "@dragons/shared";
import { useId } from "react";

import { renderButtonEmoji } from "../discord-preview/emoji";
import { ButtonStyleSelect } from "../panel-editor/ButtonStyleSelect";
import { EmojiPicker } from "../panel-editor/EmojiPicker";

/**
 * Editor de um botao do fluxo: texto, emoji e cor. O texto pode ficar vazio
 * quando ha emoji (botao so com icone, como os da ficha).
 */
export function ButtonConfigEditor({
  label,
  button,
  onChange
}: {
  label: string;
  button: RecruitmentButtonConfig;
  onChange: (next: RecruitmentButtonConfig) => void;
}) {
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-ground p-3">
      <span className="font-body text-xs font-medium text-ink-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={button.label}
          maxLength={PANEL_LIMITS.BUTTON_LABEL_MAX}
          placeholder="Texto (opcional se houver emoji)"
          onChange={(event) => onChange({ ...button, label: event.target.value })}
          className="min-w-40 flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
        />
        {button.emoji ? (
          <button
            type="button"
            onClick={() => onChange({ ...button, emoji: null })}
            title="Remover emoji"
            className="flex h-9 items-center gap-1 rounded-lg border border-line px-2 font-body text-sm text-ink transition-colors hover:border-danger hover:text-danger"
          >
            {renderButtonEmoji(button.emoji)}
            <span className="text-xs">×</span>
          </button>
        ) : null}
        <EmojiPicker
          label={`Escolher emoji: ${label}`}
          onSelect={(emoji) => onChange({ ...button, emoji })}
        />
      </div>
      <ButtonStyleSelect
        value={button.style}
        onChange={(style) => onChange({ ...button, style })}
        idPrefix={idPrefix}
      />
    </div>
  );
}
