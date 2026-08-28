import type { PanelActionConfig, SupportCategoryConfig } from "@dragons/shared";
import { SELECT_LIMITS } from "@dragons/shared";
import { useId, useRef } from "react";

import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "../components/icons";
import { ActionEditor } from "./ActionEditor";
import { CharacterCounter } from "./CharacterCounter";
import { EmojiPicker } from "./EmojiPicker";
import type { LocalSelectOption } from "./types";
import { useCursorInsert } from "./useCursorInsert";

interface SelectOptionEditorProps {
  option: LocalSelectOption;
  index: number;
  total: number;
  categories: SupportCategoryConfig[];
  onChange: (next: LocalSelectOption) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/** Cartao de edicao de uma opcao do dropdown (label, descricao, emoji, acao). */
export function SelectOptionEditor({
  option,
  index,
  total,
  categories,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: SelectOptionEditorProps) {
  const fieldId = useId();
  const emojiRef = useRef<HTMLInputElement>(null);
  const insertIntoEmoji = useCursorInsert(emojiRef, option.emoji ?? "", (next) =>
    onChange({ ...option, emoji: next || null })
  );

  function handleActionChange(action: PanelActionConfig) {
    onChange({ ...option, action });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">
          #{index + 1}
          {option.id ? ` · id: ${option.id}` : " · nova"}
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
            <span className="sr-only">Mover opção para cima</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Mover para baixo"
            className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDownIcon className="h-4 w-4" />
            <span className="sr-only">Mover opção para baixo</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remover opção"
            className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only">Remover opção</span>
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
              Texto da opção
            </label>
            <CharacterCounter current={option.label.length} max={SELECT_LIMITS.OPTION_LABEL_MAX} />
          </div>
          <input
            id={`${fieldId}-label`}
            type="text"
            value={option.label}
            onChange={(event) => onChange({ ...option, label: event.target.value })}
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
              value={option.emoji ?? ""}
              onChange={(event) => onChange({ ...option, emoji: event.target.value || null })}
              placeholder="😀 ou <:nome:id>"
              className="w-32 rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
            />
            <EmojiPicker onSelect={insertIntoEmoji} label="Inserir emoji do servidor" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`${fieldId}-desc`}
            className="font-body text-xs font-medium text-ink-muted"
          >
            Descrição (opcional)
          </label>
          <CharacterCounter
            current={(option.description ?? "").length}
            max={SELECT_LIMITS.OPTION_DESCRIPTION_MAX}
          />
        </div>
        <input
          id={`${fieldId}-desc`}
          type="text"
          value={option.description ?? ""}
          onChange={(event) => onChange({ ...option, description: event.target.value || null })}
          className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
        />
      </div>

      <ActionEditor action={option.action} onChange={handleActionChange} categories={categories} />
    </li>
  );
}
