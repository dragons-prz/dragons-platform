import { useRef } from "react";
import type { ReactNode } from "react";

import { EmojiPicker } from "./EmojiPicker";
import { useCursorInsert } from "./useCursorInsert";

/**
 * Bloco de texto: `<textarea>` com barra de formatação (título, negrito,
 * itálico, código, citação) que embrulha/insere markdown no cursor, mais o
 * seletor de emojis do servidor (`EmojiPicker`).
 */
export function TextBlockEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insertAtCursor = useCursorInsert(ref, value, onChange);

  function wrap(before: string, after: string) {
    const el = ref.current;
    if (!el) {
      onChange(value + before + after);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function linePrefix(prefix: string) {
    const el = ref.current;
    if (!el) {
      onChange(prefix + value);
      return;
    }
    const caret = el.selectionStart ?? 0;
    const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
    const hasPrefix = value.slice(lineStart).startsWith(prefix);
    const next = hasPrefix
      ? value.slice(0, lineStart) + value.slice(lineStart + prefix.length)
      : value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const delta = hasPrefix ? -prefix.length : prefix.length;
      const pos = Math.max(lineStart, caret + delta);
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Formatação">
        <FmtButton title="Título" onClick={() => linePrefix("## ")}>
          H
        </FmtButton>
        <FmtButton title="Negrito" onClick={() => wrap("**", "**")}>
          <strong>B</strong>
        </FmtButton>
        <FmtButton title="Itálico" onClick={() => wrap("*", "*")}>
          <em>i</em>
        </FmtButton>
        <FmtButton title="Código" onClick={() => wrap("`", "`")}>
          <span className="font-mono text-[11px]">{"</>"}</span>
        </FmtButton>
        <FmtButton title="Citação" onClick={() => linePrefix("> ")}>
          ❝
        </FmtButton>
        <EmojiPicker onSelect={insertAtCursor} label="Inserir emoji do servidor" />
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="resize-y rounded-lg border border-line bg-ground px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-ember"
      />
    </div>
  );
}

function FmtButton({
  title,
  onClick,
  children
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid h-8 min-w-8 place-items-center rounded-md border border-line bg-surface-2 px-2 font-display text-xs font-semibold text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
    >
      {children}
    </button>
  );
}
