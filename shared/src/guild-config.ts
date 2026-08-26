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

export type RoleConfigKey = "recruiter" | "founder" | "member";
export type ChannelConfigKey = "approval" | "recruitment" | "blacklist" | "verification" | "exit";
export type NumberConfigKey = "points" | "credit-window-hours";

/**
 * Valores padrao dos campos opcionais-na-pratica do `guildConfigs/{guildId}`,
 * espelho dos `DEFAULT_*` / `MEMBER_*` / `RECRUITMENT_*` de
 * `dragonsbot/src/domain/types.ts`. O bot grava esses defaults no documento
 * no primeiro `getGuildConfig`; o painel os aplica em memoria na leitura
 * (`normalizeGuildConfig`) para refletir o valor efetivo mesmo antes de o
 * bot ter rodado com o campo novo.
 */
export const GUILD_CONFIG_DEFAULTS = {
  recruitmentAnnouncementChannelId: "1522080152094249140",
  blacklistLogChannelId: "1541992716496273478",
  memberVerificationChannelId: "1534723901421256784",
  memberExitChannelId: "1534735482460831884",
  recruitmentPoints: 8,
  recruitmentCreditWindowHours: 24
} as const;

export interface GuildConfig {
  guildId: string;
  recruiterRoleId: string;
  founderRoleId: string;
  memberRoleId: string;
  approvalChannelId: string | null;
  recruitmentAnnouncementChannelId: string;
  blacklistLogChannelId: string;
  /** Canal onde o card de fila de verificacao de novos membros e postado. */
  memberVerificationChannelId: string;
  /** Canal onde o card de saida de membro e postado. */
  memberExitChannelId: string;
  /** Pontos creditados ao recrutador quando um recrutamento e aprovado. */
  recruitmentPoints: number;
  /** Janela (horas) apos a entrada em que ainda cabe pedir credito de recrutamento. */
  recruitmentCreditWindowHours: number;
  hierarchySeeded: boolean;
}
