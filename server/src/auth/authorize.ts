import type { AppEnv } from "../config/env.js";
import { getGuild, getGuildMember, getGuildRoles } from "../discord/discord-client.js";
import { getFounderRoleId } from "../firestore/guild-config-repository.js";

const ADMINISTRATOR_BIT = BigInt(0x8);

export type AuthorizationDeniedReason = "not_in_guild" | "no_permission";

export type AuthorizationResult =
  | { authorized: true; isFounder: boolean; isAdmin: boolean }
  | { authorized: false; reason: AuthorizationDeniedReason };

/**
 * Decide se o usuario pode entrar no painel.
 *
 * Usa exclusivamente o token do BOT para consultar a API do Discord
 * (nunca o access token do usuario) — o usuario logado nao precisa ter
 * nenhuma permissao especial no proprio token OAuth, quem verifica e o
 * bot, que ja esta no servidor.
 *
 * Autorizado = e founder (tem o cargo founderRoleId) OU e admin (dono do
 * servidor ou tem um cargo com o bit ADMINISTRATOR ligado).
 */
export async function authorizeUser(env: AppEnv, userId: string): Promise<AuthorizationResult> {
  const guildId = env.discordGuildId;

  const member = await getGuildMember(env, guildId, userId);
  if (!member) {
    return { authorized: false, reason: "not_in_guild" };
  }

  const [guild, roles, founderRoleId] = await Promise.all([
    getGuild(env, guildId),
    getGuildRoles(env, guildId),
    getFounderRoleId(env, guildId)
  ]);

  const isOwner = guild.owner_id === userId;
  const rolesById = new Map(roles.map((role) => [role.id, role]));

  const hasAdministratorRole = member.roles.some((roleId) => {
    const role = rolesById.get(roleId);
    if (!role) return false;
    // permissions vem como string decimal — precisa de BigInt para testar
    // o bit sem overflow (Number perde precisao acima de 2^53).
    return (BigInt(role.permissions) & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT;
  });

  const isAdmin = isOwner || hasAdministratorRole;
  const isFounder = member.roles.includes(founderRoleId);

  if (!isFounder && !isAdmin) {
    return { authorized: false, reason: "no_permission" };
  }

  return { authorized: true, isFounder, isAdmin };
}
