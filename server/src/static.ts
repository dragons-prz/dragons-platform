import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "./utils/logger.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve para `<raiz>/client/dist` tanto rodando compilado (`server/dist/`)
 * quanto em desenvolvimento via tsx (`server/src/`) — os dois estao um nivel
 * abaixo de `server/`.
 */
const CLIENT_DIST = join(currentDir, "..", "..", "client", "dist");

/**
 * Serve a SPA compilada.
 *
 * Em desenvolvimento o Vite serve o client na 5173 e faz proxy de `/api` para
 * ca, entao `client/dist` normalmente nao existe — nesse caso a funcao apenas
 * avisa e nao registra nada.
 */
export async function registerStaticClient(app: FastifyInstance): Promise<void> {
  if (!existsSync(CLIENT_DIST)) {
    logger.warn("static.client_dist_missing", { path: CLIENT_DIST });
    return;
  }

  await app.register(fastifyStatic, { root: CLIENT_DIST, wildcard: false });

  // Fallback de SPA: qualquer rota que nao seja de API devolve o index.html,
  // para que o roteamento client-side funcione ao recarregar direto em
  // /acesso-negado ou /configuracao. Rotas /api/ inexistentes continuam 404.
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not_found" });
    }

    return reply.sendFile("index.html");
  });

  logger.info("static.client_registered", { path: CLIENT_DIST });
}
