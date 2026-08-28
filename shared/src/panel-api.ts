import type { PanelActionConfig, PanelButtonStyle, PanelConfig, PanelKind } from "./panel.js";
import type { PanelJobStatus } from "./panel-job.js";

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
  responseImageUrl: string | null;
  responseColor: string | null;
  /**
   * Acao do botao. Opcional para retrocompatibilidade: quando ausente, o
   * servidor monta `{ type: "reply", ... }` a partir de
   * `response`/`responseImageUrl`/`responseColor`.
   */
  action?: PanelActionConfig;
}

/**
 * Uma opcao de dropdown enviada pelo client. `id` segue a mesma regra do
 * botao (so enviado quando ja existe; o servidor decide o id final via
 * `assignSelectOptionIds`).
 */
export interface PanelSelectOptionInput {
  id?: string;
  label: string;
  description: string | null;
  emoji: string | null;
  action: PanelActionConfig;
}

export interface PanelSelectInput {
  placeholder: string;
  options: PanelSelectOptionInput[];
}

/**
 * Todos os campos sao opcionais — envie so o que quer alterar. `buttons` e
 * `select`, quando enviados, substituem o valor inteiro. `kind` alterna
 * entre painel de botoes e painel de dropdown.
 */
export interface UpdatePanelRequest {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  color?: string | null;
  kind?: PanelKind;
  buttons?: PanelButtonInput[];
  select?: PanelSelectInput | null;
}

/** Resposta de `PATCH /api/panels/:id` — alem do painel atualizado, indica se uma sincronizacao com o Discord foi enfileirada automaticamente. */
export interface UpdatePanelResponse {
  panel: PanelConfig;
  syncQueued: boolean;
}

/** Corpo de `POST /api/panels/:id/publish` — publicacao inicial num canal escolhido pelo usuario. */
export interface PublishPanelRequest {
  channelId: string;
}

/** Resposta de `POST /api/panels/:id/publish`. */
export interface PublishPanelResponse {
  jobId: string;
  status: PanelJobStatus;
}

/** Resposta de `GET /api/panels/:id/publish-status` — `null` quando o painel nunca teve um job de publicacao. */
export type PanelPublishStatusResponse = {
  status: PanelJobStatus;
  messageId: string | null;
  error: string | null;
  channelId: string;
  createdAt: string;
  updatedAt: string;
} | null;
