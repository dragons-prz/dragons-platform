/**
 * Tipo NOVO, exclusivo do painel — ainda NAO existe em
 * `dragonsbot/src/domain/types.ts`. Sera criado la quando o bot ganhar o
 * worker que processa jobs de publicacao de painel. Ate isso acontecer,
 * este tipo vive apenas aqui.
 */

export type PanelJobStatus = "pending" | "processing" | "completed" | "failed";

export interface PanelJob {
  id: string;
  guildId: string;
  panelId: string;
  channelId: string;
  requestedByUserId: string;
  status: PanelJobStatus;
  messageId: string | null;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
