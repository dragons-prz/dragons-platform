import type {
  PanelActionConfig,
  PanelButtonStyle,
  PanelConfig,
  PanelSeparatorSpacing
} from "./panel.js";
import type { PanelJobStatus } from "./panel-job.js";

/**
 * Contrato dos endpoints de escrita de paineis (`POST /api/panels`,
 * `PATCH /api/panels/:id`). NAO e espelho de um tipo do bot — e o formato
 * de requisicao especifico do dragons-platform.
 */

export interface CreatePanelRequest {
  id: string;
  /** Titulo inicial — o painel nasce com um unico bloco de texto `## {title}`. */
  title: string;
}

/**
 * Um botao enviado pelo client. `id` so deve vir quando o botao ja existe
 * no painel; para um botao novo, deixe ausente. O servidor decide o id
 * final (`assignButtonIds`), unico no painel INTEIRO.
 */
export interface PanelButtonInput {
  id?: string;
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
  /** Quando ausente, o servidor monta `{ type: "reply", ... }` dos campos legados. */
  action?: PanelActionConfig;
}

export interface PanelSelectOptionInput {
  id?: string;
  label: string;
  description: string | null;
  emoji: string | null;
  action: PanelActionConfig;
}

export type PanelBlockInput =
  | { type: "text"; content: string }
  | { type: "image"; url: string }
  | { type: "separator"; divider: boolean; spacing: PanelSeparatorSpacing }
  | { type: "buttons"; buttons: PanelButtonInput[] }
  | { type: "select"; placeholder: string; options: PanelSelectOptionInput[] };

/**
 * Envie so o que quer alterar. `blocks`, quando enviado, substitui a lista
 * inteira.
 */
export interface UpdatePanelRequest {
  color?: string | null;
  blocks?: PanelBlockInput[];
}

/** Resposta de `PATCH /api/panels/:id`. */
export interface UpdatePanelResponse {
  panel: PanelConfig;
  syncQueued: boolean;
}

/** Corpo de `POST /api/panels/:id/publish`. */
export interface PublishPanelRequest {
  channelId: string;
}

export interface PublishPanelResponse {
  jobId: string;
  status: PanelJobStatus;
}

export type PanelPublishStatusResponse = {
  status: PanelJobStatus;
  messageId: string | null;
  error: string | null;
  channelId: string;
  createdAt: string;
  updatedAt: string;
} | null;
