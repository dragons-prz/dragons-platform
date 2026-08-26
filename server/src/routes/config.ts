import type {
  GuildConfigHealthCheck,
  GuildConfigHealthLevel,
  GuildConfigHealthResponse,
  UpdateGuildConfigRequest
} from "@dragons/shared";
import { validateGuildConfigUpdate } from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getGuildChannels, getGuildMember, getGuildRoles } from "../discord/discord-client.js";
import { getGuildConfig, updateGuildConfig } from "../firestore/guild-config-repository.js";
import { ValidationError } from "../errors.js";
import { logger } from "../utils/logger.js";
import { respondError } from "./respond-error.js";

const LEVEL_RANK: Record<GuildConfigHealthLevel, number> = { ok: 0, warning: 1, error: 2 };

/**
 * Rotas da configuracao da guild (`guildConfigs/{guildId}`):
 * - `GET /api/config` — leitura do documento completo.
 * - `PATCH /api/config` — atualizacao parcial de cargos, canais e parametros
 *   numericos do `GuildConfig` (ver
 *   `docs/specs/2026-08-26-configuracao-editavel.md`).
 * - `GET /api/config/health` — diagnostico da integracao (cargos/canais
 *   configurados e existentes, hierarquia do bot no Discord).
 *
 * O `requireAuth` (aplicado pelo chamador) ja garante que so founders/admins
 * autorizados chegam aqui.
 */
export function registerConfigRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/config", async (_request, reply) => {
    try {
      const config = await getGuildConfig(env, env.discordGuildId);
      return reply.send(config);
    } catch (error) {
      return respondError(reply, "config.get_failed", error);
    }
  });

  app.patch<{ Body: Partial<UpdateGuildConfigRequest> }>("/api/config", async (request, reply) => {
    try {
      const patch = (request.body ?? {}) as UpdateGuildConfigRequest;

      const shapeError = validateGuildConfigUpdate(patch);
      if (shapeError) {
        throw new ValidationError(shapeError);
      }

      const [roles, channels] = await Promise.all([
        getGuildRoles(env, env.discordGuildId),
        getGuildChannels(env, env.discordGuildId)
      ]);
      const roleIds = new Set(roles.map((role) => role.id));
      const channelIds = new Set(channels.map((channel) => channel.id));

      for (const key of ["recruiterRoleId", "founderRoleId", "memberRoleId"] as const) {
        const value = patch[key];
        if (value !== undefined && !roleIds.has(value)) {
          throw new ValidationError(`O cargo selecionado para "${key}" nao existe neste servidor.`);
        }
      }

      for (const key of [
        "recruitmentAnnouncementChannelId",
        "blacklistLogChannelId",
        "memberVerificationChannelId",
        "memberExitChannelId"
      ] as const) {
        const value = patch[key];
        if (value !== undefined && !channelIds.has(value)) {
          throw new ValidationError(
            `O canal selecionado para "${key}" nao existe ou nao e um canal de texto.`
          );
        }
      }
      if (
        patch.approvalChannelId !== undefined &&
        patch.approvalChannelId !== null &&
        !channelIds.has(patch.approvalChannelId)
      ) {
        throw new ValidationError(
          'O canal selecionado para "approvalChannelId" nao existe ou nao e um canal de texto.'
        );
      }

      const updated = await updateGuildConfig(env, env.discordGuildId, patch);
      logger.info("config.updated", {
        guildId: env.discordGuildId,
        userId: request.authSession?.id,
        keys: Object.keys(patch)
      });
      return reply.send(updated);
    } catch (error) {
      return respondError(reply, "config.update_failed", error);
    }
  });

  app.get("/api/config/health", async (_request, reply) => {
    try {
      const health = await computeGuildConfigHealth(env);
      return reply.send(health);
    } catch (error) {
      return respondError(reply, "config.health_failed", error);
    }
  });
}

async function computeGuildConfigHealth(env: AppEnv): Promise<GuildConfigHealthResponse> {
  // O id da aplicacao do Discord (`discordClientId`) e o mesmo id de usuario
  // do bot na guild — usado para localizar o proprio bot como membro.
  const [config, roles, channels, botMember] = await Promise.all([
    getGuildConfig(env, env.discordGuildId),
    getGuildRoles(env, env.discordGuildId),
    getGuildChannels(env, env.discordGuildId),
    getGuildMember(env, env.discordGuildId, env.discordClientId)
  ]);

  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const channelsById = new Map(channels.map((channel) => [channel.id, channel]));
  const checks: GuildConfigHealthCheck[] = [];

  const roleTargets: Array<{ id: string; roleId: string; label: string }> = [
    { id: "recruiterRoleId", roleId: config.recruiterRoleId, label: "Cargo de recrutador" },
    { id: "founderRoleId", roleId: config.founderRoleId, label: "Cargo de founder" },
    { id: "memberRoleId", roleId: config.memberRoleId, label: "Cargo de membro" }
  ];
  for (const target of roleTargets) {
    const role = target.roleId ? rolesById.get(target.roleId) : undefined;
    if (!target.roleId) {
      checks.push({
        id: target.id,
        level: "error",
        label: target.label,
        detail: "Nao configurado."
      });
    } else if (!role) {
      checks.push({
        id: target.id,
        level: "error",
        label: target.label,
        detail: `O cargo salvo (${target.roleId}) nao existe mais neste servidor.`
      });
    } else {
      checks.push({
        id: target.id,
        level: "ok",
        label: target.label,
        detail: `Apontando para @${role.name}.`
      });
    }
  }

  const channelTargets: Array<{
    id: string;
    channelId: string | null;
    label: string;
    required: boolean;
  }> = [
    {
      id: "recruitmentAnnouncementChannelId",
      channelId: config.recruitmentAnnouncementChannelId,
      label: "Canal de anuncio de recrutamento",
      required: true
    },
    {
      id: "blacklistLogChannelId",
      channelId: config.blacklistLogChannelId,
      label: "Canal de log de blacklist",
      required: true
    },
    {
      id: "memberVerificationChannelId",
      channelId: config.memberVerificationChannelId,
      label: "Canal de fila de verificacao",
      required: true
    },
    {
      id: "memberExitChannelId",
      channelId: config.memberExitChannelId,
      label: "Canal de saida de membro",
      required: true
    },
    {
      id: "approvalChannelId",
      channelId: config.approvalChannelId,
      label: "Canal de aprovacao",
      required: false
    }
  ];
  for (const target of channelTargets) {
    const channel = target.channelId ? channelsById.get(target.channelId) : undefined;
    if (!target.channelId) {
      checks.push({
        id: target.id,
        level: target.required ? "error" : "warning",
        label: target.label,
        detail: target.required
          ? "Nao configurado."
          : "Nao configurado — o bot manda a aprovacao por DM aos founders."
      });
    } else if (!channel) {
      checks.push({
        id: target.id,
        level: "error",
        label: target.label,
        detail: `O canal salvo (${target.channelId}) nao existe ou nao e um canal de texto.`
      });
    } else {
      checks.push({
        id: target.id,
        level: "ok",
        label: target.label,
        detail: `Apontando para #${channel.name}.`
      });
    }
  }

  // Hierarquia do Discord: o cargo mais alto do bot precisa estar acima do
  // cargo de membro, senao o bot nao consegue aplica-lo (ver README do bot).
  const memberRole = config.memberRoleId ? rolesById.get(config.memberRoleId) : undefined;
  if (!memberRole) {
    checks.push({
      id: "botHierarchy",
      level: "warning",
      label: "Hierarquia do bot",
      detail: "Nao da para verificar sem um cargo de membro valido configurado."
    });
  } else if (!botMember) {
    checks.push({
      id: "botHierarchy",
      level: "warning",
      label: "Hierarquia do bot",
      detail: "Nao foi possivel localizar o proprio bot como membro deste servidor."
    });
  } else {
    const botTopPosition = botMember.roles.reduce((max, roleId) => {
      const position = rolesById.get(roleId)?.position ?? -1;
      return position > max ? position : max;
    }, -1);

    if (botTopPosition > memberRole.position) {
      checks.push({
        id: "botHierarchy",
        level: "ok",
        label: "Hierarquia do bot",
        detail: `O cargo do bot esta acima de @${memberRole.name} na hierarquia do Discord.`
      });
    } else {
      checks.push({
        id: "botHierarchy",
        level: "error",
        label: "Hierarquia do bot",
        detail: `O cargo do bot esta abaixo (ou no mesmo nivel) de @${memberRole.name} — o bot nao consegue aplicar esse cargo. Suba o cargo do bot no Discord.`
      });
    }
  }

  const worst = checks.reduce<GuildConfigHealthLevel>(
    (acc, check) => (LEVEL_RANK[check.level] > LEVEL_RANK[acc] ? check.level : acc),
    "ok"
  );

  return { checks, worst };
}
