/**
 * ESPELHO de `dragonsbot/src/domain/types.ts` (`SupportCategoryConfig`,
 * `TicketRecord`).
 *
 * `supportCategories/{guildId}_{id}` e escrita SO pela dragons-platform; o
 * bot apenas le. `tickets/{ticketId}` e o oposto: escrita SO pelo bot,
 * leitura aqui (dashboard, fase 3). Mudanca de forma = PR coordenado nos
 * dois repos.
 */

export type SupportCategoryCloseAction = "archive-remove";

export interface SupportCategoryConfig {
  id: string;
  guildId: string;
  name: string;
  /** Canal de texto onde o topico privado do ticket e criado. */
  parentChannelId: string;
  /** Cargos marcados no topico e unicos que podem Atender/Fechar. */
  supportRoleIds: string[];
  /** Cargos que so visualizam o topico (marcados junto, sem poder de acao). */
  viewerRoleIds: string[];
  /** Nome do topico; `{user}` vira o nome de quem abriu (em slug). */
  threadNameTemplate: string;
  /** Primeira mensagem no topico. Aceita `{user}`. */
  openMessage: string;
  /** Postada ao "Atender". Aceita `{user}` e `{claimer}`. */
  claimMessage: string;
  /** Postada ao "Fechar". Aceita `{user}` e `{closer}`. */
  closeMessage: string;
  closeAction: SupportCategoryCloseAction;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = "open" | "claimed" | "closed";

export interface TicketRecord {
  id: string;
  guildId: string;
  panelId: string;
  categoryId: string;
  openerUserId: string;
  parentChannelId: string;
  threadId: string;
  pingMessageId: string;
  status: TicketStatus;
  claimedByUserId: string | null;
  claimedAt: string | null;
  closedByUserId: string | null;
  closedAt: string | null;
  feedbackRating: number | null;
  feedbackComment: string | null;
  createdAt: string;
  updatedAt: string;
}
