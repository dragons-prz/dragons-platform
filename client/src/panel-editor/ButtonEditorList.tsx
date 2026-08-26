import { PANEL_LIMITS } from "@dragons/shared";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import { PlusIcon } from "../components/icons";
import { ButtonEditor } from "./ButtonEditor";
import { createLocalButtonId } from "./types";
import type { LocalButton } from "./types";

/**
 * Lista de botoes do painel: adicionar, editar, remover e reordenar.
 * Reordenar funciona por arrastar (mouse) E pelos botoes mover-para-cima/
 * mover-para-baixo em cada item — arrastar sozinho seria inacessivel por
 * teclado.
 */
export function ButtonEditorList({
  buttons,
  onChange
}: {
  buttons: LocalButton[];
  onChange: (next: LocalButton[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  function moveButton(from: number, to: number) {
    if (to < 0 || to >= buttons.length || from === to) return;
    const next = [...buttons];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function updateButton(index: number, next: LocalButton) {
    onChange(buttons.map((button, i) => (i === index ? next : button)));
  }

  function removeButton(index: number) {
    onChange(buttons.filter((_, i) => i !== index));
  }

  function addButton() {
    const next: LocalButton = {
      key: createLocalButtonId(),
      label: "",
      emoji: null,
      style: "Secondary",
      response: ""
    };
    onChange([...buttons, next]);
  }

  function handleDragStart(index: number) {
    return () => {
      dragIndexRef.current = index;
      setDragIndex(index);
    };
  }

  function handleDragOver(index: number) {
    return (event: DragEvent<HTMLLIElement>) => {
      if (dragIndexRef.current === null) return;
      event.preventDefault();
      setDragOverIndex(index);
    };
  }

  function handleDrop(index: number) {
    return (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
      if (from === null) return;
      moveButton(from, index);
    };
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Botões</h2>
        <span className="font-mono text-xs text-ink-muted">
          {buttons.length}/{PANEL_LIMITS.MAX_BUTTONS}
        </span>
      </div>

      {buttons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center font-body text-sm text-ink-muted">
          Nenhum botão ainda. Adicione o primeiro abaixo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" onDragEnd={() => setDragIndex(null)}>
          {buttons.map((button, index) => (
            <ButtonEditor
              key={button.key}
              button={button}
              index={index}
              total={buttons.length}
              onChange={(next) => updateButton(index, next)}
              onRemove={() => removeButton(index)}
              onMoveUp={() => moveButton(index, index - 1)}
              onMoveDown={() => moveButton(index, index + 1)}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              isDragTarget={dragIndex !== null && dragOverIndex === index && dragIndex !== index}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addButton}
        disabled={buttons.length >= PANEL_LIMITS.MAX_BUTTONS}
        className="flex w-fit items-center gap-2 rounded-lg border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar botão
      </button>
    </div>
  );
}
