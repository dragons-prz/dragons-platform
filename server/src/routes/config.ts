import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getGuildConfig } from "../firestore/guild-config-repository.js";
import { respondError } from "./respond-error.js";

/** Rota de leitura da configuracao da guild (`guildConfigs/{guildId}`). Somente leitura nesta fase. */
export function registerConfigRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/config", async (_request, reply) => {
    try {
      const config = await getGuildConfig(env, env.discordGuildId);
      return reply.send(config);
    } catch (error) {
      return respondError(reply, "config.get_failed", error);
    }
  });
}
