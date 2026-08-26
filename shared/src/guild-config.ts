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
export type ChannelConfigKey = "approval" | "recruitment" | "blacklist";

export interface GuildConfig {
  guildId: string;
  recruiterRoleId: string;
  founderRoleId: string;
  memberRoleId: string;
  approvalChannelId: string | null;
  recruitmentAnnouncementChannelId: string;
  blacklistLogChannelId: string;
  hierarchySeeded: boolean;
}
