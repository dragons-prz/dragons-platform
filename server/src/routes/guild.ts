import type {
  DiscordChannelSummary,
  DiscordEmojiSummary,
  DiscordRoleSummary
} from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getGuildChannels, getGuildEmojis, getGuildRoles } from "../discord/discord-client.js";
import { respondError } from "./respond-error.js";

/**
 * Rotas de leitura de recursos brutos da guild do Discord (canais, cargos,
 * emojis) — usadas pelo painel para resolver IDs em nomes legiveis (ex.:
 * configuracao de cargos/canais, seletor de emoji ao criar um botao).
 * `getGuildChannels`/`getGuildRoles`/`getGuildEmojis` ja cacheiam ~60s por
 * guild em `discord-client.ts`.
 */
export function registerGuildRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/guild/channels", async (_request, reply) => {
    try {
      const channels = await getGuildChannels(env, env.discordGuildId);
      const summaries: DiscordChannelSummary[] = channels
        .map((channel) => ({ id: channel.id, name: channel.name, type: channel.type }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return reply.send(summaries);
    } catch (error) {
      return respondError(reply, "guild.channels_failed", error);
    }
  });

  app.get("/api/guild/roles", async (_request, reply) => {
    try {
      const roles = await getGuildRoles(env, env.discordGuildId);
      const summaries: DiscordRoleSummary[] = roles
        .filter((role) => role.id !== env.discordGuildId) // @everyone tem o mesmo id da guild
        .map((role) => ({ id: role.id, name: role.name, color: role.color }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return reply.send(summaries);
    } catch (error) {
      return respondError(reply, "guild.roles_failed", error);
    }
  });

  app.get("/api/guild/emojis", async (_request, reply) => {
    try {
      const emojis = await getGuildEmojis(env, env.discordGuildId);
      const summaries: DiscordEmojiSummary[] = emojis
        .map((emoji) => ({ id: emoji.id, name: emoji.name, animated: emoji.animated }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return reply.send(summaries);
    } catch (error) {
      return respondError(reply, "guild.emojis_failed", error);
    }
  });
}
