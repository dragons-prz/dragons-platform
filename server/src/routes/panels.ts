import type {
  CreatePanelRequest,
  PanelButtonConfig,
  PanelButtonInput,
  PanelPublishStatusResponse,
  PublishPanelRequest,
  PublishPanelResponse,
  UpdatePanelRequest,
  UpdatePanelResponse
} from "@dragons/shared";
import {
  assignButtonIds,
  validateButtons,
  validateDescription,
  validateImageUrl,
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
      const description = typeof body.description === "string" ? body.description : "";

      const idError = validatePanelId(id);
      if (idError) throw new ValidationError(idError);

      const titleError = validateTitle(title);
      if (titleError) throw new ValidationError(titleError);

      const descriptionError = validateDescription(description);
      if (descriptionError) throw new ValidationError(descriptionError);

      const panel = await createPanel(env, env.discordGuildId, id, title, description);
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

        const patch: {
          title?: string;
          description?: string;
          imageUrl?: string | null;
          buttons?: PanelButtonConfig[];
        } = {};

        if (body.title !== undefined) {
          const error = validateTitle(body.title);
          if (error) throw new ValidationError(error);
          patch.title = body.title;
        }

        if (body.description !== undefined) {
          const error = validateDescription(body.description);
          if (error) throw new ValidationError(error);
          patch.description = body.description;
        }

        if (body.imageUrl !== undefined) {
          if (body.imageUrl !== null) {
            const error = validateImageUrl(body.imageUrl);
            if (error) throw new ValidationError(error);
          }
          patch.imageUrl = body.imageUrl;
        }

        if (body.buttons !== undefined) {
          const buttons: PanelButtonInput[] = body.buttons;
          const buttonsError = validateButtons(buttons);
          if (buttonsError) throw new ValidationError(buttonsError);
          patch.buttons = assignButtonIds(existing.buttons, buttons);
        }

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

        if (panel.buttons.length === 0) {
          throw new ValidationError("Adicione ao menos um botão antes de publicar.");
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
