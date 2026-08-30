import type {
  CreatePanelRequest,
  PanelActionConfig,
  PanelBlock,
  PanelBlockInput,
  PanelPublishStatusResponse,
  PublishPanelRequest,
  PublishPanelResponse,
  UpdatePanelRequest,
  UpdatePanelResponse
} from "@dragons/shared";
import {
  assignBlockIds,
  resolveButtonAction,
  validateBlocks,
  validateColor,
  validatePanelId,
  validateTitle
} from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { ValidationError } from "../errors.js";
import { createPanelJob, getLatestPanelJobForPanel } from "../firestore/panel-job-repository.js";
import {
  createPanel,
  deletePanel,
  getPanel,
  listPanels,
  updatePanel
} from "../firestore/panel-repository.js";
import { getSupportCategory } from "../firestore/support-category-repository.js";
import { logger } from "../utils/logger.js";
import { respondError } from "./respond-error.js";

/**
 * Rotas de leitura e escrita de paineis. O `requireAuth` (aplicado pelo
 * chamador) ja garante que so founders/admins autorizados chegam aqui.
 *
 * A publicacao efetiva no Discord (postar/editar a mensagem) e feita pelo
 * worker `startPanelJobWorker` no bot (`dragonsbot`, ja em producao), que
 * consome a colecao `panelJobs` a cada 5s. Este arquivo so enfileira jobs
 * (`panel-job-repository.ts`) e le o documento `panels/{guildId}_{id}` no
 * mesmo formato que
 * `dragonsbot/src/storage/firestore/FirestoreDragonsStore.ts` produz.
 */
export function registerPanelRoutes(app: FastifyInstance, env: AppEnv): void {
  app.get("/api/panels", async (_request, reply) => {
    try {
      const panels = await listPanels(env, env.discordGuildId);
      return reply.send(panels);
    } catch (error) {
      return respondError(reply, "panels.list_failed", error);
    }
  });

  app.get<{ Params: { id: string } }>("/api/panels/:id", async (request, reply) => {
    try {
      const panel = await getPanel(env, env.discordGuildId, request.params.id);
      if (!panel) {
        return reply.code(404).send({ error: `Painel "${request.params.id}" nao encontrado.` });
      }
      return reply.send(panel);
    } catch (error) {
      return respondError(reply, "panels.get_failed", error);
    }
  });

  app.post<{ Body: Partial<CreatePanelRequest> }>("/api/panels", async (request, reply) => {
    try {
      const body = request.body ?? {};
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const title = typeof body.title === "string" ? body.title : "";

      const idError = validatePanelId(id);
      if (idError) throw new ValidationError(idError);

      const titleError = validateTitle(title);
      if (titleError) throw new ValidationError(titleError);

      const panel = await createPanel(env, env.discordGuildId, id, title);
      logger.info("panel.created", {
        guildId: env.discordGuildId,
        panelId: id,
        userId: request.authSession?.id
      });
      return reply.code(201).send(panel);
    } catch (error) {
      return respondError(reply, "panels.create_failed", error);
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdatePanelRequest & { id?: string } }>(
    "/api/panels/:id",
    async (request, reply) => {
      try {
        const id = request.params.id;
        const body = request.body ?? {};

        // O id compoe o doc-id e o custom_id dos botoes ja publicados — imutavel depois de criado.
        if (body.id !== undefined && body.id !== id) {
          throw new ValidationError(
            "O identificador do painel não pode ser alterado depois de criado."
          );
        }

        const existing = await getPanel(env, env.discordGuildId, id);
        if (!existing) {
          return reply.code(404).send({ error: `Painel "${id}" nao encontrado.` });
        }

        const patch: { color?: string | null; blocks?: PanelBlock[] } = {};

        if (body.color !== undefined) {
          if (body.color !== null) {
            const error = validateColor(body.color);
            if (error) throw new ValidationError(error);
          }
          patch.color = body.color;
        }

        if (body.blocks !== undefined) {
          const blocks: PanelBlockInput[] = body.blocks;
          const blocksError = validateBlocks(blocks);
          if (blocksError) throw new ValidationError(blocksError);
          patch.blocks = assignBlockIds(existing.blocks, blocks);
        }

        const finalBlocks = patch.blocks ?? existing.blocks;

        // Toda acao `run` que aponta para uma categoria de suporte precisa
        // referenciar uma categoria que existe de fato.
        await assertSupportCategoriesExist(
          env,
          finalBlocks.flatMap((block) => {
            if (block.type === "buttons") return block.buttons.map((b) => resolveButtonAction(b));
            if (block.type === "select") return block.options.map((o) => o.action);
            return [];
          })
        );

        const panel = await updatePanel(env, env.discordGuildId, id, patch);
        logger.info("panel.updated", {
          guildId: env.discordGuildId,
          panelId: id,
          userId: request.authSession?.id
        });

        // Sincronizacao automatica: se o painel ja foi publicado (tem um
        // canal registrado), qualquer edicao salva deve refletir sozinha no
        // Discord, sem o usuario precisar clicar em nada — o worker do bot
        // pega o job em ate 5s. Um painel NUNCA publicado (ou publicado
        // antes de `publishedChannelId` existir, como `guia-recrutamento`)
        // nao enfileira nada aqui: a primeira publicacao e uma decisao
        // explicita do usuario (rota `/publish` abaixo), que escolhe o
        // canal — nunca deduzida automaticamente.
        let syncQueued = false;
        if (panel.publishedChannelId) {
          await createPanelJob(env, {
            guildId: env.discordGuildId,
            panelId: id,
            channelId: panel.publishedChannelId,
            requestedByUserId: request.authSession?.id ?? "unknown"
          });
          syncQueued = true;
          logger.info("panel.sync_queued", {
            guildId: env.discordGuildId,
            panelId: id,
            channelId: panel.publishedChannelId,
            userId: request.authSession?.id
          });
        }

        const response: UpdatePanelResponse = { panel, syncQueued };
        return reply.send(response);
      } catch (error) {
        return respondError(reply, "panels.update_failed", error);
      }
    }
  );

  app.post<{ Params: { id: string }; Body: Partial<PublishPanelRequest> }>(
    "/api/panels/:id/publish",
    async (request, reply) => {
      try {
        const id = request.params.id;
        const channelId =
          typeof request.body?.channelId === "string" ? request.body.channelId.trim() : "";

        if (!channelId) {
          throw new ValidationError("Selecione um canal para publicar o painel.");
        }

        const panel = await getPanel(env, env.discordGuildId, id);
        if (!panel) {
          return reply.code(404).send({ error: `Painel "${id}" nao encontrado.` });
        }

        if (panel.blocks.length === 0) {
          throw new ValidationError("Adicione ao menos um bloco antes de publicar.");
        }

        const job = await createPanelJob(env, {
          guildId: env.discordGuildId,
          panelId: id,
          channelId,
          requestedByUserId: request.authSession?.id ?? "unknown"
        });
        logger.info("panel.publish_queued", {
          guildId: env.discordGuildId,
          panelId: id,
          channelId,
          userId: request.authSession?.id
        });

        const response: PublishPanelResponse = { jobId: job.id, status: job.status };
        return reply.code(202).send(response);
      } catch (error) {
        return respondError(reply, "panels.publish_failed", error);
      }
    }
  );

  app.get<{ Params: { id: string } }>("/api/panels/:id/publish-status", async (request, reply) => {
    try {
      const id = request.params.id;

      const panel = await getPanel(env, env.discordGuildId, id);
      if (!panel) {
        return reply.code(404).send({ error: `Painel "${id}" nao encontrado.` });
      }

      const job = await getLatestPanelJobForPanel(env, env.discordGuildId, id);
      const response: PanelPublishStatusResponse = job
        ? {
            status: job.status,
            messageId: job.messageId,
            error: job.error,
            channelId: job.channelId,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          }
        : null;
      return reply.send(response);
    } catch (error) {
      return respondError(reply, "panels.publish_status_failed", error);
    }
  });

  app.delete<{ Params: { id: string } }>("/api/panels/:id", async (request, reply) => {
    try {
      await deletePanel(env, env.discordGuildId, request.params.id);
      logger.info("panel.deleted", {
        guildId: env.discordGuildId,
        panelId: request.params.id,
        userId: request.authSession?.id
      });
      return reply.code(204).send();
    } catch (error) {
      return respondError(reply, "panels.delete_failed", error);
    }
  });
}

/**
 * Para cada acao `run` com `actionId: "support-ticket"`, confere que a
 * categoria referenciada em `params.category` existe em
 * `supportCategories/{guildId}_{id}`. Falha cedo com 400 em vez de deixar o
 * bot recusar o ticket em runtime.
 */
async function assertSupportCategoriesExist(
  env: AppEnv,
  actions: readonly PanelActionConfig[]
): Promise<void> {
  const categoryIds = new Set<string>();
  for (const action of actions) {
    if (action.type === "run" && action.actionId === "support-ticket") {
      const categoryId = action.params?.category;
      if (categoryId) categoryIds.add(categoryId);
    }
  }
  if (categoryIds.size === 0) return;

  const found = await Promise.all(
    [...categoryIds].map(async (categoryId) => ({
      categoryId,
      exists: Boolean(await getSupportCategory(env, env.discordGuildId, categoryId))
    }))
  );
  const missing = found.filter((entry) => !entry.exists).map((entry) => entry.categoryId);
  if (missing.length > 0) {
    throw new ValidationError(
      `Categoria(s) de suporte inexistente(s): ${missing.join(", ")}. Crie a categoria antes de referenciá-la no painel.`
    );
  }
}
