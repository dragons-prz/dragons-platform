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

export interface PanelButtonConfig {
  id: string;
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
  response: string;
  order: number;
}

export interface PanelConfig {
  id: string;
  guildId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  buttons: PanelButtonConfig[];
  createdAt: string;
  updatedAt: string;
}
