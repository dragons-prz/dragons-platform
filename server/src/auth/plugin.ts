import type { AuthSession } from "@dragons/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { AppEnv } from "../config/env.js";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session.js";

declare module "fastify" {
  interface FastifyRequest {
    authSession: AuthSession | null;
  }
}

/**
 * Decodifica o cookie de sessao (se houver) em toda requisicao e expoe o
 * resultado em `request.authSession` — `null` quando nao autenticado.
 */
export function registerAuthPlugin(app: FastifyInstance, env: AppEnv): void {
  app.decorateRequest("authSession", null);

  app.addHook("onRequest", async (request) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    request.authSession = token ? await verifySessionToken(env, token) : null;
  });
}

/**
 * PreHandler para proteger rotas autenticadas. Responde 401 de forma
 * consistente quando nao ha sessao valida.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.authSession) {
    await reply.code(401).send({ error: "unauthenticated" });
  }
}
