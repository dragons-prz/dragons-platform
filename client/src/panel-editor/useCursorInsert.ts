import { useCallback } from "react";
import type { RefObject } from "react";

/**
 * Retorna uma funcao que insere texto na posicao atual do cursor de um
 * campo (textarea ou input) — usada pelo seletor de emoji para inserir o
 * codigo completo (`<:nome:id>`) sem sobrescrever o resto do texto. Se o
 * campo nao estiver montado/focado, cai para o fim do valor atual.
 */
export function useCursorInsert(
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  value: string,
  onChange: (next: string) => void
): (insertText: string) => void {
  return useCallback(
    (insertText: string) => {
      const el = ref.current;
      if (!el) {
        onChange(value + insertText);
        return;
      }

      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + insertText + value.slice(end);
      onChange(next);

      requestAnimationFrame(() => {
        el.focus();
        const cursorPos = start + insertText.length;
        el.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [ref, value, onChange]
  );
}
