import type { SupportCategoryConfig } from "@dragons/shared";
import { SELECT_LIMITS } from "@dragons/shared";

import { PlusIcon } from "../components/icons";
import { SelectOptionEditor } from "./SelectOptionEditor";
import { createLocalButtonId, emptyReplyAction } from "./types";
import type { LocalSelectOption } from "./types";

interface SelectOptionEditorListProps {
  placeholder: string;
  options: LocalSelectOption[];
  categories: SupportCategoryConfig[];
  onPlaceholderChange: (next: string) => void;
  onOptionsChange: (next: LocalSelectOption[]) => void;
}

/** Editor do dropdown de um painel do tipo `select`: texto de instrucao + opcoes. */
export function SelectOptionEditorList({
  placeholder,
  options,
  categories,
  onPlaceholderChange,
  onOptionsChange
}: SelectOptionEditorListProps) {
  function move(from: number, to: number) {
    if (to < 0 || to >= options.length || from === to) return;
    const next = [...options];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onOptionsChange(next);
  }

  function update(index: number, next: LocalSelectOption) {
    onOptionsChange(options.map((option, i) => (i === index ? next : option)));
  }

  function remove(index: number) {
    onOptionsChange(options.filter((_, i) => i !== index));
  }

  function add() {
    onOptionsChange([
      ...options,
      {
        key: createLocalButtonId(),
        label: "",
        description: null,
        emoji: null,
        action: emptyReplyAction()
      }
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="select-placeholder"
          className="font-body text-xs font-medium text-ink-muted"
        >
          Texto de instrução do dropdown
        </label>
        <input
          id="select-placeholder"
          type="text"
          value={placeholder}
          maxLength={SELECT_LIMITS.PLACEHOLDER_MAX}
          onChange={(event) => onPlaceholderChange(event.target.value)}
          placeholder="Selecione uma opção!"
          className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Opções do dropdown</h2>
        <span className="font-mono text-xs text-ink-muted">
          {options.length}/{SELECT_LIMITS.MAX_OPTIONS}
        </span>
      </div>

      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center font-body text-sm text-ink-muted">
          Nenhuma opção ainda. Adicione a primeira abaixo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {options.map((option, index) => (
            <SelectOptionEditor
              key={option.key}
              option={option}
              index={index}
              total={options.length}
              categories={categories}
              onChange={(next) => update(index, next)}
              onRemove={() => remove(index)}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        disabled={options.length >= SELECT_LIMITS.MAX_OPTIONS}
        className="flex w-fit items-center gap-2 rounded-lg border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar opção
      </button>
    </div>
  );
}
