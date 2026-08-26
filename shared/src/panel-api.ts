import type { PanelButtonStyle } from "./panel.js";

/**
 * Contrato dos endpoints de escrita de paineis (`POST /api/panels`,
 * `PATCH /api/panels/:id`). Diferente de `panel.ts`, isto NAO e espelho de
 * um tipo do bot — e o formato de requisicao especifico do
 * dragons-platform.
 */

export interface CreatePanelRequest {
  id: string;
  title: string;
  description: string;
}

/**
 * Um botao enviado pelo client ao salvar. `id` so deve ser enviado quando o
 * botao ja existe no painel (veio de uma resposta anterior da API) — para
 * um botao novo, deixe `id` ausente. O servidor decide o id final (ver
 * `assignButtonIds` em `panel-validation.ts`); nunca confie no `id`
 * enviado se ele nao corresponder a um botao ja existente no painel.
 */
export interface PanelButtonInput {
  id?: string;
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
  response: string;
}

/** Todos os campos sao opcionais — envie so o que quer alterar. `buttons`, quando enviado, substitui o array inteiro. */
export interface UpdatePanelRequest {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  buttons?: PanelButtonInput[];
}
