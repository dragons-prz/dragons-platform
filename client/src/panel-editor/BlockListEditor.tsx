import type { SupportCategoryConfig } from "@dragons/shared";
import { PANEL_BLOCK_LIMITS, validateImageUrl } from "@dragons/shared";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import { ButtonEditorList } from "./ButtonEditorList";
import { ImageUrlField } from "./ImageUrlField";
import { SelectOptionEditorList } from "./SelectOptionEditorList";
import { TextBlockEditor } from "./TextBlockEditor";
import { newLocalBlock } from "./blocks";
import type { LocalBlock, LocalBlockType } from "./blocks";

const BLOCK_META: Record<LocalBlockType, { label: string; dot: string }> = {
  text: { label: "Texto", dot: "bg-[#8ab4f8]" },
  image: { label: "Banner", dot: "bg-ember" },
  separator: { label: "Separador", dot: "bg-[#7a7280]" },
  buttons: { label: "Botões", dot: "bg-[#4bbf7b]" },
  select: { label: "Dropdown", dot: "bg-[#c084fc]" }
};

const PALETTE_ORDER: LocalBlockType[] = ["text", "image", "separator", "buttons", "select"];

export function BlockListEditor({
  blocks,
  categories,
  onChange
}: {
  blocks: LocalBlock[];
  categories: SupportCategoryConfig[];
  onChange: (next: LocalBlock[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const hasSelect = blocks.some((block) => block.type === "select");

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function replaceAt(index: number, block: LocalBlock) {
    onChange(blocks.map((b, i) => (i === index ? block : b)));
  }

  function removeAt(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addBlock(type: LocalBlockType) {
    // Bloco novo entra no TOPO da lista.
    onChange([newLocalBlock(type), ...blocks]);
  }

  function onDragStart(index: number) {
    dragRef.current = index;
    setDragIndex(index);
  }
  function onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    setOverIndex(index);
  }
  function onDrop(index: number) {
    const from = dragRef.current;
    dragRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null) return;
    move(from, index);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-5">
      <span className="font-body text-xs font-medium text-ink-muted">
        Blocos ({blocks.length}/{PANEL_BLOCK_LIMITS.MAX_BLOCKS}) — arraste para reordenar; um bloco
        novo entra no topo
      </span>

      <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-line bg-surface p-3">
        {PALETTE_ORDER.map((type) => {
          const disabled =
            blocks.length >= PANEL_BLOCK_LIMITS.MAX_BLOCKS || (type === "select" && hasSelect);
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => addBlock(type)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 font-display text-xs font-semibold text-ink transition-colors hover:border-ember hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className={`h-2 w-2 rounded-[2px] ${BLOCK_META[type].dot}`} />
              {BLOCK_META[type].label}
            </button>
          );
        })}
      </div>

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-3 py-4 font-body text-sm text-ink-muted">
          Nenhum bloco. Adicione um acima.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <div
            key={block.key}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => onDragOver(event, index)}
            onDrop={() => onDrop(index)}
            className={`overflow-hidden rounded-xl border bg-surface transition-colors ${
              dragIndex === index
                ? "border-ember opacity-50"
                : overIndex === index
                  ? "border-ember"
                  : "border-line"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-2 py-2">
              <span
                className="cursor-grab px-1 text-ink-muted active:cursor-grabbing"
                title="Arraste para reordenar"
                aria-hidden="true"
              >
                ⠿
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 font-display text-xs font-semibold text-ink-muted">
                <span className={`h-1.5 w-1.5 rounded-[2px] ${BLOCK_META[block.type].dot}`} />
                {BLOCK_META[block.type].label}
              </span>
              <div className="ml-auto flex gap-0.5">
                <IconBtn
                  label="Mover para cima"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </IconBtn>
                <IconBtn
                  label="Mover para baixo"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </IconBtn>
                <IconBtn label="Remover bloco" danger onClick={() => removeAt(index)}>
                  ✕
                </IconBtn>
              </div>
            </div>

            <div className="p-3">
              {block.type === "text" ? (
                <TextBlockEditor
                  value={block.content}
                  onChange={(content) => replaceAt(index, { ...block, content })}
                />
              ) : null}

              {block.type === "image" ? (
                <ImageUrlField
                  label="URL do banner"
                  value={block.url}
                  onChange={(url) => replaceAt(index, { ...block, url })}
                  error={block.url.trim().length > 0 ? validateImageUrl(block.url) : null}
                />
              ) : null}

              {block.type === "separator" ? (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 font-body text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={block.divider}
                      onChange={(event) =>
                        replaceAt(index, { ...block, divider: event.target.checked })
                      }
                    />
                    Mostrar linha divisória
                  </label>
                  <label className="flex items-center gap-2 font-body text-sm text-ink-muted">
                    Espaçamento
                    <select
                      value={block.spacing}
                      onChange={(event) =>
                        replaceAt(index, {
                          ...block,
                          spacing: event.target.value as "small" | "large"
                        })
                      }
                      className="rounded-lg border border-line bg-ground px-2 py-1.5 font-body text-sm text-ink"
                    >
                      <option value="small">Pequeno</option>
                      <option value="large">Grande</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {block.type === "buttons" ? (
                <ButtonEditorList
                  buttons={block.buttons}
                  categories={categories}
                  onChange={(buttons) => replaceAt(index, { ...block, buttons })}
                />
              ) : null}

              {block.type === "select" ? (
                <SelectOptionEditorList
                  placeholder={block.placeholder}
                  options={block.options}
                  categories={categories}
                  onPlaceholderChange={(placeholder) => replaceAt(index, { ...block, placeholder })}
                  onOptionsChange={(options) => replaceAt(index, { ...block, options })}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:text-danger" : ""
      }`}
    >
      {children}
    </button>
  );
}
