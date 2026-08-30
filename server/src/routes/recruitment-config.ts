import type { UpdateRecruitmentConfigRequest } from "@dragons/shared";
import { validateRecruitmentConfig } from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getGuildChannels, getGuildRoles } from "../discord/discord-client.js";
import { ValidationError } from "../errors.js";
import {
  getRecruitmentConfig,
  putRecruitmentConfig
} from "../firestore/recruitment-config-repository.js";
import { logger } from "../utils/logger.js";
import { respondError } from "./respond-error.js";

/**
 * Configuracao do fluxo de recrutamento (`recruitmentConfigs/{guildId}`).
 * O bot le esse documento a cada `/recrutar`; a escrita e exclusiva daqui —
 * nao existe comando do bot que edite isso. `requireAuth` (aplicado pelo
 * chamador) restringe a founders/admins.
 */
export function registerRecruitmentConfigRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/recruitment-config", async (request, reply) => {
    try {
      const config = await getRecruitmentConfig(env, env.discordGuildId);
      logger.info("recruitment_config.read", {
        guildId: env.discordGuildId,
        userId: request.authSession?.id
      });
      return reply.send(config);
    } catch (error) {
      return respondError(reply, "recruitment_config.get_failed", error);
    }
  });

  app.put<{ Body: UpdateRecruitmentConfigRequest }>(
    "/api/recruitment-config",
    async (request, reply) => {
      try {
        const body = request.body;
        const shapeError = validateRecruitmentConfig(body);
        if (shapeError) throw new ValidationError(shapeError);

        await assertGuildRefs(env, body);

        const config = await putRecruitmentConfig(env, env.discordGuildId, body);
        logger.info("recruitment_config.updated", {
          guildId: env.discordGuildId,
          userId: request.authSession?.id,
          starterRoles: config.starterRoles.length,
          areas: config.areas.length,
          approverRoles: config.approverRoleIds.length,
          pointsMode: config.pointsMode
        });
        return reply.send(config);
      } catch (error) {
        return respondError(reply, "recruitment_config.update_failed", error);
      }
    }
  );
}

/** Checa que os cargos/canal referenciados existem mesmo na guild. */
async function assertGuildRefs(env: AppEnv, config: UpdateRecruitmentConfigRequest): Promise<void> {
  const referencedChannels: [string, string][] = [
    ...(config.sheet.channelId
      ? [[config.sheet.channelId, "canal das fichas"] as [string, string]]
      : []),
    ...(config.verificationTicket.parentChannelId
      ? [
          [config.verificationTicket.parentChannelId, "canal do ticket de verificação"] as [
            string,
            string
          ]
        ]
      : []),
    ...(config.familyRoute.sheetChannelId
      ? [[config.familyRoute.sheetChannelId, "canal da ficha (rota Família)"] as [string, string]]
      : []),
    ...(config.areaRoute.sheetChannelId
      ? [[config.areaRoute.sheetChannelId, "canal da ficha (rota Área)"] as [string, string]]
      : [])
  ];

  const [channels, roles] = await Promise.all([
    referencedChannels.length > 0 ? getGuildChannels(env, env.discordGuildId) : Promise.resolve([]),
    getGuildRoles(env, env.discordGuildId)
  ]);

  const channelIds = new Set(channels.map((channel) => channel.id));
  for (const [channelId, label] of referencedChannels) {
    if (!channelIds.has(channelId)) {
      throw new ValidationError(`O ${label} selecionado nao existe ou nao e um canal de texto.`);
    }
  }

  const roleIds = new Set(roles.map((role) => role.id));
  const referenced: [string, string][] = [
    ...config.starterRoles.map(
      (option) => [option.roleId, `cargo de iniciante "${option.label}"`] as [string, string]
    ),
    ...config.areas.flatMap((area) =>
      area.roleIds.map((roleId) => [roleId, `area "${area.label}"`] as [string, string])
    ),
    ...config.approverRoleIds.map(
      (roleId) => [roleId, "cargos que aprovam a ficha"] as [string, string]
    ),
    ...config.familyRoute.approverRoleIds.map(
      (roleId) => [roleId, "cargos que confirmam (rota Família)"] as [string, string]
    ),
    ...config.areaRoute.approverRoleIds.map(
      (roleId) => [roleId, "cargos que confirmam (rota Área)"] as [string, string]
    ),
    ...config.pointsGrantRoleIds.map(
      (roleId) => [roleId, "cargos que podem dar pontos"] as [string, string]
    ),
    ...config.pointsResetRoleIds.map(
      (roleId) => [roleId, "cargos que podem resetar pontos"] as [string, string]
    )
  ];

  for (const [roleId, label] of referenced) {
    if (!roleIds.has(roleId)) {
      throw new ValidationError(`O cargo ${roleId} (${label}) nao existe neste servidor.`);
    }
  }
}
