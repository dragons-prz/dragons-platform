import type { AuthSession } from "@dragons/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { AppEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { authorizeUser } from "./authorize.js";
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

const REVALIDATION_TTL_MS = 60_000;

interface RevalidationEntry {
  isFounder: boolean;
  isAdmin: boolean;
  expiresAt: number;
}

/**
 * Cache em memoria (por processo) do resultado da reconferencia de cargos,
 * por usuario. O JWT de sessao dura 8h, mas cargos/permissoes no Discord
 * podem mudar a qualquer momento (ex.: founder perde o cargo) — sem isso,
 * quem perde a permissao continuaria acessando rotas protegidas ate o
 * cookie expirar. TTL curto (~60s) para nao estourar rate limit do Discord,
 * mesmo padrao de `discord-client.ts` (getGuild/getGuildRoles).
 */
const revalidationCache = new Map<string, RevalidationEntry>();

function getCachedRevalidation(userId: string): RevalidationEntry | undefined {
  const entry = revalidationCache.get(userId);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    revalidationCache.delete(userId);
    return undefined;
  }
  return entry;
}

function setCachedRevalidation(userId: string, value: Omit<RevalidationEntry, "expiresAt">): void {
  revalidationCache.set(userId, { ...value, expiresAt: Date.now() + REVALIDATION_TTL_MS });
}

/**
 * Cria o preHandler que protege rotas autenticadas.
 *
 * Alem de exigir um cookie de sessao valido, reconfere os cargos do
 * usuario no Discord a cada requisicao (via `authorizeUser`, cacheado
 * ~60s por usuario) — um JWT valido nao basta, porque `isFounder`/
 * `isAdmin` podem ter ficado desatualizados desde o login. Se a
 * reconferencia mostrar que o usuario nao e mais autorizado (perdeu o
 * cargo, saiu do servidor, etc.), a sessao e tratada como revogada mesmo
 * com o cookie ainda valido.
 */
export function createRequireAuth(env: AppEnv) {
  return async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const session = request.authSession;
    if (!session) {
      await reply.code(401).send({ error: "unauthenticated" });
      return;
    }

    const cached = getCachedRevalidation(session.id);
    if (cached) {
      request.authSession = { ...session, isFounder: cached.isFounder, isAdmin: cached.isAdmin };
      return;
    }

    try {
      const result = await authorizeUser(env, session.id);
      if (!result.authorized) {
        logger.warn("auth.session_revoked", { userId: session.id, reason: result.reason });
        await reply.code(401).send({ error: "unauthenticated" });
        return;
      }

      setCachedRevalidation(session.id, { isFounder: result.isFounder, isAdmin: result.isAdmin });
      request.authSession = { ...session, isFounder: result.isFounder, isAdmin: result.isAdmin };
    } catch (error) {
      logger.warn("auth.session_revoked", {
        userId: session.id,
        reason: "revalidation_error",
        message: error instanceof Error ? error.message : String(error)
      });
      await reply.code(401).send({ error: "unauthenticated" });
    }
  };
}
