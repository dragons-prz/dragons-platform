import type {
  CreatePanelRequest,
  PanelButtonConfig,
  PanelButtonInput,
  UpdatePanelRequest
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
 * Publicacao no Discord NAO e feita aqui — isso e a fase 4 e depende de
 * mudancas no repositorio do bot. Estas rotas so leem/escrevem o documento
 * `panels/{guildId}_{id}` no Firestore, no mesmo formato que
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
        return reply.send(panel);
      } catch (error) {
        return respondError(reply, "panels.update_failed", error);
      }
    }
  );

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
