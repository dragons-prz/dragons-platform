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
 *
 * Spec: `docs/specs/2026-08-31-painel-blocos.md`.
 */

export type PanelButtonStyle = "Primary" | "Secondary" | "Success" | "Danger";

/**
 * Formato de uma mensagem. Os PAINEIS nao usam mais isso (sao sempre
 * Container / Components V2, via blocos), mas o fluxo de recrutamento
 * (`recruitment-config.ts`) ainda tem mensagens `embed`/`container`.
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

/* ------------------------------------------------------------------ *
 * Blocos (Components V2)
 *
 * O painel e uma lista ordenada de blocos, renderizada sempre como um
 * Container (Components V2). Nao ha mais `layout: "embed"`.
 * ------------------------------------------------------------------ */

export type PanelBlockType = "text" | "image" | "separator" | "buttons" | "select";
export type PanelSeparatorSpacing = "small" | "large";

export interface PanelTextBlock {
  type: "text";
  /** Markdown do Discord (##, **, *, `, >). Renderizado cru num TextDisplay. */
  content: string;
}

export interface PanelImageBlock {
  type: "image";
  /** URL http(s) — vira um MediaGallery (banner) no Container. */
  url: string;
}

export interface PanelSeparatorBlock {
  type: "separator";
  divider: boolean;
  spacing: PanelSeparatorSpacing;
}

export interface PanelButtonsBlock {
  type: "buttons";
  /** 1..25 botoes; o render quebra em linhas de 5. */
  buttons: PanelButtonConfig[];
}

export interface PanelSelectBlock {
  type: "select";
  placeholder: string;
  options: PanelSelectOption[];
}

export type PanelBlock =
  PanelTextBlock | PanelImageBlock | PanelSeparatorBlock | PanelButtonsBlock | PanelSelectBlock;

export interface PanelConfig {
  id: string;
  guildId: string;
  /** Cor de acento do Container (hex `#RRGGBB`) ou `null`. */
  color: string | null;
  blocks: PanelBlock[];
  createdAt: string;
  updatedAt: string;
  publishedChannelId?: string | null;
  publishedMessageId?: string | null;

  /**
   * Campos LEGADOS do formato antigo (title/description/imagem/kind/
   * layout/buttons/select no topo). So a migracao de leitura (`mapPanel` /
   * `panel-repository`) os usa para montar `blocks` quando o documento
   * ainda nao tem o campo. Escrita nova nunca os grava.
   */
  title?: string;
  description?: string;
  imageUrl?: string | null;
  kind?: "buttons" | "select" | "text";
  layout?: "embed" | "container";
  buttons?: PanelButtonConfig[];
  select?: PanelSelectConfig | null;
}
