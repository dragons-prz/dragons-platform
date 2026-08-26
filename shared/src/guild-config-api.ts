/**
 * Contrato dos endpoints de ESCRITA e de diagnostico da configuracao da
 * guild (`PATCH /api/config`, `GET /api/config/health`).
 *
 * Diferente de `guild-config.ts`, isto NAO e espelho de um tipo do bot — e
 * o formato de requisicao/resposta especifico do dragons-platform. O
 * documento gravado no Firestore continua sendo `GuildConfig` (o mesmo que
 * o bot le), entao esta fase nao muda nenhum campo do `guildConfigs/{id}`.
 */

/** Snowflake do Discord: 17-20 digitos. */
export const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

/** Chaves de cargo editaveis pelo painel (todas obrigatorias no `GuildConfig`). */
export const EDITABLE_ROLE_KEYS = ["recruiterRoleId", "founderRoleId", "memberRoleId"] as const;

/** Chaves de canal obrigatorias no `GuildConfig` (nunca nulas). */
export const REQUIRED_CHANNEL_KEYS = [
  "recruitmentAnnouncementChannelId",
  "blacklistLogChannelId",
  "memberVerificationChannelId",
  "memberExitChannelId"
] as const;

/** Chaves numericas editaveis (inteiro >= 1). */
export const EDITABLE_NUMBER_KEYS = ["recruitmentPoints", "recruitmentCreditWindowHours"] as const;

/**
 * Campos aceitos em `PATCH /api/config`. Todos opcionais — envie so o que
 * quer alterar. `approvalChannelId: null` limpa o canal de aprovacao (o bot
 * volta a mandar a aprovacao por DM aos founders).
 */
export interface UpdateGuildConfigRequest {
  recruiterRoleId?: string;
  founderRoleId?: string;
  memberRoleId?: string;
  approvalChannelId?: string | null;
  recruitmentAnnouncementChannelId?: string;
  blacklistLogChannelId?: string;
  memberVerificationChannelId?: string;
  memberExitChannelId?: string;
  recruitmentPoints?: number;
  recruitmentCreditWindowHours?: number;
}

/**
 * Valida a FORMA do patch (tipo e formato de snowflake), sem checar se os
 * ids existem de fato na guild — essa checagem e feita no servidor, que tem
 * a lista de cargos/canais do Discord. Retorna a mensagem de erro em
 * portugues, ou `null` se valido.
 */
export function validateGuildConfigUpdate(patch: UpdateGuildConfigRequest): string | null {
  let touched = false;

  for (const key of EDITABLE_ROLE_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    touched = true;
    if (typeof value !== "string" || !DISCORD_SNOWFLAKE_PATTERN.test(value)) {
      return `O cargo "${key}" precisa ser um id de cargo valido do Discord.`;
    }
  }

  for (const key of REQUIRED_CHANNEL_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    touched = true;
    if (typeof value !== "string" || !DISCORD_SNOWFLAKE_PATTERN.test(value)) {
      return `O canal "${key}" precisa ser um id de canal valido do Discord.`;
    }
  }

  if (patch.approvalChannelId !== undefined) {
    touched = true;
    if (
      patch.approvalChannelId !== null &&
      !(
        typeof patch.approvalChannelId === "string" &&
        DISCORD_SNOWFLAKE_PATTERN.test(patch.approvalChannelId)
      )
    ) {
      return 'O canal "approvalChannelId" precisa ser um id de canal valido do Discord ou nulo.';
    }
  }

  for (const key of EDITABLE_NUMBER_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    touched = true;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      return `O parametro "${key}" precisa ser um numero inteiro maior ou igual a 1.`;
    }
  }

  if (!touched) {
    return "Nenhum campo de configuracao para atualizar.";
  }

  return null;
}

export type GuildConfigHealthLevel = "ok" | "warning" | "error";

/** Uma linha do bloco de saude da configuracao no painel. */
export interface GuildConfigHealthCheck {
  id: string;
  level: GuildConfigHealthLevel;
  label: string;
  detail: string;
}

export interface GuildConfigHealthResponse {
  checks: GuildConfigHealthCheck[];
  /** Pior nivel entre os checks — atalho para a UI destacar o bloco. */
  worst: GuildConfigHealthLevel;
}
