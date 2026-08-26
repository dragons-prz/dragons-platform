import type { DiscordEmojiSummary } from "@dragons/shared";
import { useEffect, useRef, useState } from "react";

import { fetchGuildEmojis } from "../api/guild";
import { EmojiIcon, SpinnerIcon } from "../components/icons";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; emojis: DiscordEmojiSummary[] };

/** Formato completo que o Discord espera em texto (`<:nome:id>` ou `<a:nome:id>`), nunca `:nome:` solto. */
function emojiCode(emoji: DiscordEmojiSummary): string {
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

function emojiImageUrl(emoji: DiscordEmojiSummary): string {
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`;
}

/**
 * Seletor de emoji alimentado por `GET /api/guild/emojis` — mostra os
 * emojis reais do servidor com a imagem e, ao escolher, entrega o codigo
 * completo pronto para inserir no campo de destino (via `onSelect`). Existe
 * para eliminar o erro de digitar `:nome:` solto, que o Discord renderiza
 * como texto literal (ver `discord-preview/emoji.tsx`).
 */
export function EmojiPicker({
  onSelect,
  label
}: {
  onSelect: (code: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // So busca ao abrir; se ja carregou, mantem o resultado. Nao depende de
    // `state.status` para nao ficar preso em "loading" quando o StrictMode
    // remonta o efeito (a primeira requisicao e abortada pelo cleanup e a
    // segunda passada precisa refazer o fetch).
    if (!open || state.status === "ready") return;

    setState({ status: "loading" });
    const controller = new AbortController();
    fetchGuildEmojis(controller.signal)
      .then((emojis) => setState({ status: "ready", emojis }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setState({ status: "error", message });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={label}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
      >
        <EmojiIcon className="h-5 w-5" />
        <span className="sr-only">{label}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Emojis do servidor"
          className="absolute right-0 z-10 mt-2 max-h-64 w-64 overflow-y-auto rounded-lg border border-line bg-surface-2 p-2 shadow-lg"
        >
          {state.status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-4 font-body text-xs text-ink-muted">
              <SpinnerIcon className="h-4 w-4" />
              Carregando emojis...
            </div>
          ) : null}

          {state.status === "error" ? (
            <p className="p-2 font-body text-xs text-danger">{state.message}</p>
          ) : null}

          {state.status === "ready" && state.emojis.length === 0 ? (
            <p className="p-2 font-body text-xs text-ink-muted">
              Este servidor não tem emojis customizados.
            </p>
          ) : null}

          {state.status === "ready" && state.emojis.length > 0 ? (
            <div className="grid grid-cols-6 gap-1">
              {state.emojis.map((emoji) => (
                <button
                  key={emoji.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  title={`:${emoji.name}:`}
                  onClick={() => {
                    onSelect(emojiCode(emoji));
                    setOpen(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-surface"
                >
                  <img src={emojiImageUrl(emoji)} alt={`:${emoji.name}:`} className="h-6 w-6" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
