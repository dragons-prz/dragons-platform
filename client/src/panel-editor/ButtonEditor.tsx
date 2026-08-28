import type { PanelActionConfig, PanelButtonStyle, SupportCategoryConfig } from "@dragons/shared";
import { PANEL_LIMITS } from "@dragons/shared";
import { useId, useRef } from "react";
import type { DragEvent } from "react";

import { ArrowDownIcon, ArrowUpIcon, DragHandleIcon, TrashIcon } from "../components/icons";
import { ActionEditor } from "./ActionEditor";
import { CharacterCounter } from "./CharacterCounter";
import { EmojiPicker } from "./EmojiPicker";
import { syncLegacyReplyFields } from "./legacy";
import type { LocalButton } from "./types";
import { useCursorInsert } from "./useCursorInsert";
import { ButtonStyleSelect } from "./ButtonStyleSelect";

interface ButtonEditorProps {
  button: LocalButton;
  index: number;
  total: number;
  categories: SupportCategoryConfig[];
  onChange: (next: LocalButton) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  isDragTarget: boolean;
}

/** Um cartao de edicao de botao (label, estilo, emoji, acao) com controles de remover e reordenar. */
export function ButtonEditor({
  button,
  index,
  total,
  categories,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget
}: ButtonEditorProps) {
  const fieldId = useId();
  const emojiRef = useRef<HTMLInputElement>(null);

  const insertIntoEmoji = useCursorInsert(emojiRef, button.emoji ?? "", (next) =>
    onChange({ ...button, emoji: next || null })
  );

  function handleActionChange(action: PanelActionConfig) {
    onChange({ ...button, action, ...syncLegacyReplyFields(action) });
  }

  return (
    <li
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        isDragTarget ? "border-ember" : "border-line"
      } bg-surface`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          title="Arraste para reordenar"
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-ink-muted hover:text-ink active:cursor-grabbing"
        >
          <DragHandleIcon className="h-5 w-5" />
          <span className="sr-only">Arrastar botão "{button.label || "sem texto"}"</span>
        </button>

        <span className="font-mono text-xs text-ink-muted">
          #{index + 1}
          {button.id ? ` · id: ${button.id}` : " · novo"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Mover para cima"
            className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUpIcon className="h-4 w-4" />
            <span className="sr-only">Mover botão para cima</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Mover para baixo"
            className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDownIcon className="h-4 w-4" />
            <span className="sr-only">Mover botão para baixo</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remover botão"
            className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only">Remover botão</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${fieldId}-label`}
              className="font-body text-xs font-medium text-ink-muted"
            >
              Texto do botão
            </label>
            <CharacterCounter current={button.label.length} max={PANEL_LIMITS.BUTTON_LABEL_MAX} />
          </div>
          <input
            id={`${fieldId}-label`}
            type="text"
            value={button.label}
            onChange={(event) => onChange({ ...button, label: event.target.value })}
            maxLength={PANEL_LIMITS.BUTTON_LABEL_MAX + 20}
            className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-emoji`}
            className="font-body text-xs font-medium text-ink-muted"
          >
            Emoji (opcional)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`${fieldId}-emoji`}
              ref={emojiRef}
              type="text"
              value={button.emoji ?? ""}
              onChange={(event) => onChange({ ...button, emoji: event.target.value || null })}
              placeholder="😀 ou <:nome:id>"
              className="w-32 rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
            />
            <EmojiPicker onSelect={insertIntoEmoji} label="Inserir emoji do servidor" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-body text-xs font-medium text-ink-muted">Cor do botão</span>
        <ButtonStyleSelect
          value={button.style}
          onChange={(style: PanelButtonStyle) => onChange({ ...button, style })}
          idPrefix={fieldId}
        />
      </div>

      <ActionEditor action={button.action} onChange={handleActionChange} categories={categories} />
    </li>
  );
}
