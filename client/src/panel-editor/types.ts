import type { PanelButtonStyle } from "@dragons/shared";

/**
 * Estado local (no editor) de um botao de painel.
 *
 * `key` e so para o React (`crypto.randomUUID()` na criacao no client,
 * nunca enviado a API). `id` so existe depois que o botao foi salvo ao
 * menos uma vez — a partir dai o servidor decidiu o id definitivo (slug do
 * label no momento da criacao) e ele NUNCA muda, mesmo que o label seja
 * editado depois. Ver `assignButtonIds` em `@dragons/shared`.
 */
export interface LocalButton {
  key: string;
  id?: string;
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
}

export function createLocalButtonId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
