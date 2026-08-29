/**
 * Tipo NOVO, exclusivo do painel — nao existe no bot (que nao tem sessao
 * de usuario). Presenca "quem esta online agora e em que tela", mantida
 * apenas em memoria no processo do servidor (ver
 * `server/src/presence/registry.ts`). O client manda um heartbeat
 * periodico enquanto a aba esta visivel e recebe de volta a lista de
 * quem mais esta ativo, usada para mostrar avatares no header e um
 * indicador de "fulano editando" na lista de paineis.
 *
 * Isso NAO persiste em lugar nenhum e so funciona com uma unica
 * instancia do servidor: se um dia o painel rodar em mais de um
 * processo, este registro precisa migrar para Firestore ou Redis.
 */

/** Tamanho maximo aceito para o campo `location` (o resto e cortado). */
export const PRESENCE_LOCATION_MAX_LENGTH = 64;

/**
 * Identifica em que tela o usuario esta. Telas fixas tem um valor
 * proprio; a edicao de um recurso especifico usa um prefixo + id
 * (`panel:<id>`, `support-category:<id>`), formatado pelos helpers abaixo.
 */
export type PresenceLocation =
  | "panels"
  | "panel-new"
  | "settings"
  | "support-categories"
  | "support-category-new"
  | "recruitment"
  | `panel:${string}`
  | `support-category:${string}`
  | "unknown";

export function formatPanelLocation(panelId: string): PresenceLocation {
  return `panel:${panelId}`;
}

export function formatSupportCategoryLocation(categoryId: string): PresenceLocation {
  return `support-category:${categoryId}`;
}

/** Extrai o id do painel de um `location`, ou `null` se nao for de painel. */
export function parsePanelLocation(location: string): string | null {
  return location.startsWith("panel:") ? location.slice("panel:".length) : null;
}

export interface PresenceUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  location: string;
  /** Epoch em ms do ultimo heartbeat recebido deste usuario. */
  lastSeenAt: number;
}

/** Corpo do `POST /api/presence` (heartbeat). */
export interface PresenceHeartbeatRequest {
  location: string;
}

/** Resposta de `GET /api/presence` e `POST /api/presence`. */
export interface PresenceResponse {
  /** Usuarios com heartbeat recente, incluindo o proprio solicitante. */
  users: PresenceUser[];
}
