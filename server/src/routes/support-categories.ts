import type { CreateSupportCategoryRequest, UpdateSupportCategoryRequest } from "@dragons/shared";
import {
  SUPPORT_CATEGORY_DEFAULTS,
  validateSupportCategoryId,
  validateSupportCategoryUpdate
} from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getGuildChannels, getGuildRoles } from "../discord/discord-client.js";
import { ValidationError } from "../errors.js";
import {
  createSupportCategory,
  deleteSupportCategory,
  getSupportCategory,
  listSupportCategories,
  updateSupportCategory
} from "../firestore/support-category-repository.js";
import { logger } from "../utils/logger.js";
import { respondError } from "./respond-error.js";

/**
 * CRUD das categorias de ticket de suporte (`supportCategories/{guildId}_{id}`).
 * O bot le esses documentos ao abrir um ticket; a escrita e exclusiva daqui.
 * `requireAuth` (aplicado pelo chamador) restringe a founders/admins.
 */
export function registerSupportCategoryRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/support-categories", async (_request, reply) => {
    try {
      return reply.send(await listSupportCategories(env, env.discordGuildId));
    } catch (error) {
      return respondError(reply, "support_categories.list_failed", error);
    }
  });

  app.get<{ Params: { id: string } }>("/api/support-categories/:id", async (request, reply) => {
    try {
      const category = await getSupportCategory(env, env.discordGuildId, request.params.id);
      if (!category) {
        return reply.code(404).send({ error: `Categoria "${request.params.id}" nao encontrada.` });
      }
      return reply.send(category);
    } catch (error) {
      return respondError(reply, "support_categories.get_failed", error);
    }
  });

  app.post<{ Body: Partial<CreateSupportCategoryRequest> }>(
    "/api/support-categories",
    async (request, reply) => {
      try {
        const body = request.body ?? {};
        const id = typeof body.id === "string" ? body.id.trim() : "";
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const parentChannelId =
          typeof body.parentChannelId === "string" ? body.parentChannelId.trim() : "";

        const idError = validateSupportCategoryId(id);
        if (idError) throw new ValidationError(idError);
        if (!name) throw new ValidationError("O nome da categoria nao pode ficar vazio.");
        if (!parentChannelId) throw new ValidationError("Selecione o canal-pai dos topicos.");

        await assertChannelExists(env, parentChannelId);

        const category = await createSupportCategory(env, env.discordGuildId, {
          id,
          name,
          parentChannelId,
          supportRoleIds: [...SUPPORT_CATEGORY_DEFAULTS.supportRoleIds],
          viewerRoleIds: [...SUPPORT_CATEGORY_DEFAULTS.viewerRoleIds],
          threadNameTemplate: `${id}${SUPPORT_CATEGORY_DEFAULTS.threadNameTemplateSuffix}`,
          openMessage: SUPPORT_CATEGORY_DEFAULTS.openMessage,
          claimMessage: SUPPORT_CATEGORY_DEFAULTS.claimMessage,
          closeMessage: SUPPORT_CATEGORY_DEFAULTS.closeMessage,
          closeAction: SUPPORT_CATEGORY_DEFAULTS.closeAction
        });
        logger.info("support_category.created", {
          guildId: env.discordGuildId,
          categoryId: id,
          userId: request.authSession?.id
        });
        return reply.code(201).send(category);
      } catch (error) {
        return respondError(reply, "support_categories.create_failed", error);
      }
    }
  );

  app.patch<{ Params: { id: string }; Body: UpdateSupportCategoryRequest & { id?: string } }>(
    "/api/support-categories/:id",
    async (request, reply) => {
      try {
        const id = request.params.id;
        const body = request.body ?? {};
        if (body.id !== undefined && body.id !== id) {
          throw new ValidationError(
            "O identificador da categoria nao pode ser alterado depois de criada."
          );
        }

        const existing = await getSupportCategory(env, env.discordGuildId, id);
        if (!existing) {
          return reply.code(404).send({ error: `Categoria "${id}" nao encontrada.` });
        }

        const shapeError = validateSupportCategoryUpdate(body);
        if (shapeError) throw new ValidationError(shapeError);

        await assertGuildRefs(env, body);

        const updated = await updateSupportCategory(env, env.discordGuildId, id, body);
        logger.info("support_category.updated", {
          guildId: env.discordGuildId,
          categoryId: id,
          userId: request.authSession?.id,
          keys: Object.keys(body)
        });
        return reply.send(updated);
      } catch (error) {
        return respondError(reply, "support_categories.update_failed", error);
      }
    }
  );

  app.delete<{ Params: { id: string } }>("/api/support-categories/:id", async (request, reply) => {
    try {
      await deleteSupportCategory(env, env.discordGuildId, request.params.id);
      logger.info("support_category.deleted", {
        guildId: env.discordGuildId,
        categoryId: request.params.id,
        userId: request.authSession?.id
      });
      return reply.code(204).send();
    } catch (error) {
      return respondError(reply, "support_categories.delete_failed", error);
    }
  });
}

async function assertChannelExists(env: AppEnv, channelId: string): Promise<void> {
  const channels = await getGuildChannels(env, env.discordGuildId);
  if (!channels.some((channel) => channel.id === channelId)) {
    throw new ValidationError("O canal-pai selecionado nao existe ou nao e um canal de texto.");
  }
}

/** Checa a existencia na guild dos ids de canal/cargo enviados no patch. */
async function assertGuildRefs(env: AppEnv, patch: UpdateSupportCategoryRequest): Promise<void> {
  const needsChannels = patch.parentChannelId !== undefined;
  const needsRoles = patch.supportRoleIds !== undefined || patch.viewerRoleIds !== undefined;
  if (!needsChannels && !needsRoles) return;

  const [channels, roles] = await Promise.all([
    needsChannels ? getGuildChannels(env, env.discordGuildId) : Promise.resolve([]),
    needsRoles ? getGuildRoles(env, env.discordGuildId) : Promise.resolve([])
  ]);

  if (
    patch.parentChannelId !== undefined &&
    !channels.some((c) => c.id === patch.parentChannelId)
  ) {
    throw new ValidationError("O canal-pai selecionado nao existe ou nao e um canal de texto.");
  }

  const roleIds = new Set(roles.map((role) => role.id));
  for (const list of [patch.supportRoleIds, patch.viewerRoleIds]) {
    if (!list) continue;
    for (const roleId of list) {
      if (!roleIds.has(roleId)) {
        throw new ValidationError(`O cargo ${roleId} nao existe neste servidor.`);
      }
    }
  }
}
