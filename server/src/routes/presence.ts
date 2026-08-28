import type { PresenceHeartbeatRequest, PresenceResponse } from "@dragons/shared";
import { PRESENCE_LOCATION_MAX_LENGTH } from "@dragons/shared";
import type { FastifyInstance } from "fastify";

import { ValidationError } from "../errors.js";
import { dropPresence, listPresence, recordPresence } from "../presence/registry.js";
import { respondError } from "./respond-error.js";

/**
 * Presenca dos usuarios do painel. `requireAuth` (aplicado pelo chamador)
 * ja garante que so founders/admins autorizados chegam aqui — a presenca
 * usa exatamente os dados de `request.authSession`, nunca nada vindo do
 * corpo alem de `location`.
 *
 * Nao toca no Firestore: e tudo em memoria (`presence/registry.ts`).
 */
export function registerPresenceRoutes(app: FastifyInstance): void {
  // Heartbeat + leitura no mesmo request: a aba diz onde esta e ja recebe
  // de volta quem mais esta online. Chamado a cada ~20s enquanto visivel.
  app.post<{ Body: Partial<PresenceHeartbeatRequest> }>("/api/presence", async (request, reply) => {
    try {
      const session = request.authSession;
      if (!session) {
        // requireAuth ja barra isso; guarda extra para o TypeScript.
        return reply.code(401).send({ error: "unauthenticated" });
      }

      const rawLocation =
        typeof request.body?.location === "string" ? request.body.location.trim() : "";
      if (!rawLocation) {
        throw new ValidationError("Localizacao de presenca ausente.");
      }

      recordPresence({
        id: session.id,
        username: session.username,
        avatarUrl: session.avatarUrl,
        location: rawLocation.slice(0, PRESENCE_LOCATION_MAX_LENGTH)
      });

      const response: PresenceResponse = { users: listPresence() };
      return reply.send(response);
    } catch (error) {
      return respondError(reply, "presence.heartbeat_failed", error);
    }
  });

  app.get("/api/presence", async (_request, reply) => {
    const response: PresenceResponse = { users: listPresence() };
    return reply.send(response);
  });

  // "Saida limpa": o client chama no fechamento da aba / logout para o
  // avatar sumir na hora, sem esperar o TTL expirar.
  app.delete("/api/presence", async (request, reply) => {
    if (request.authSession) {
      dropPresence(request.authSession.id);
    }
    return reply.code(204).send();
  });
}
