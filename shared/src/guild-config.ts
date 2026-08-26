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
