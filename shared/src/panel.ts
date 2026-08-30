/**
 * ESPELHO de `dragonsbot/src/domain/types.ts` (repositorio do bot, em
 * `~/dev/dragonsbot`).
 *
 * Estes tipos precisam continuar identicos ao bot em runtime (mesmas
 * colecoes do Firestore). Qualquer alteracao de forma (campos, tipos,
 * valores possiveis) DEVE ser feita nos DOIS repositorios ao mesmo tempo —
 * `dragonsbot` e `dragons-platform` — senao os dois lados divergem
 * silenciosamente e o painel passa a ler/escrever dados incompativeis com o
 * que o bot espera.
 */

export type PanelButtonStyle = "Primary" | "Secondary" | "Success" | "Danger";

/**
 * Tipo do painel:
 * - `buttons`: linhas de botoes (o formato historico);
 * - `select`: um unico dropdown no lugar dos botoes;
 * - `text`: painel informativo — a mensagem (titulo/descricao/imagem/cor)
 *   com botoes OPCIONAIS (0..25) e sem dropdown (`select` fica `null`).
 *
 * Documentos antigos nao tem o campo — o mapeamento trata ausencia como
 * `"buttons"`.
 */
export type PanelKind = "buttons" | "select" | "text";

/**
 * Formato da mensagem do painel:
 * - `embed`: um `EmbedBuilder` (formato historico) — imagem sempre embaixo,
 *   `title` nao renderiza emoji customizado do servidor.
 * - `container`: Components V2 (`ContainerBuilder`) — a imagem vira um
 *   banner no topo e o titulo/descricao viram texto markdown (emoji de
 *   qualquer tipo em qualquer lugar).
 *
 * Documentos antigos nao tem o campo — o mapeamento trata ausencia como
 * `"embed"`.
 */
export type PanelLayout = "embed" | "container";

export interface PanelReplyAction {
  type: "reply";
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
}

export interface PanelRunAction {
  type: "run";
  actionId: string;
  params: Record<string, string>;
}

/**
 * Acao disparada quando um botao/opcao do painel e acionado. `reply`
 * responde com um embed efemero (comportamento historico); `run` dispara
 * uma acao registrada no bot (ver `PANEL_ACTIONS` em `panel-actions.ts`).
 */
export type PanelActionConfig = PanelReplyAction | PanelRunAction;

export interface PanelButtonConfig {
  id: string;
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
  /** Campos legados: quando o documento nao tem `action`, ela e montada a partir deles. */
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
  action: PanelActionConfig;
  order: number;
}

export interface PanelSelectOption {
  id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  action: PanelActionConfig;
  order: number;
}

export interface PanelSelectConfig {
  placeholder: string;
  options: PanelSelectOption[];
}

export interface PanelConfig {
  id: string;
  guildId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  color: string | null;
  kind: PanelKind;
  layout: PanelLayout;
  buttons: PanelButtonConfig[];
  /** Preenchido apenas quando `kind === "select"`; `null` caso contrario. */
  select: PanelSelectConfig | null;
  createdAt: string;
  updatedAt: string;
  publishedChannelId?: string | null;
  publishedMessageId?: string | null;
}
