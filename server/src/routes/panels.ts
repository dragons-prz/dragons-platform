import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";
import { getPanel, listPanels } from "../firestore/panel-repository.js";
import { respondError } from "./respond-error.js";

/**
 * Rotas de leitura de paineis. Somente leitura nesta fase — criacao,
 * edicao e publicacao ficam para a fase 3. O `requireAuth` (aplicado pelo
 * chamador) ja garante que so founders/admins autorizados chegam aqui.
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
}
