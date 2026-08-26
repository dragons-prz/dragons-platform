import fastifyCookie from "@fastify/cookie";
import Fastify from "fastify";

import { registerAuthPlugin } from "./auth/plugin.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { loadEnv } from "./config/env.js";
import { registerStaticClient } from "./static.js";
import { logger } from "./utils/logger.js";

interface HealthResponse {
  status: "ok";
}

async function main(): Promise<void> {
  const env = loadEnv();
  const app = Fastify({ logger: false });

  // Cookies assinados (state do OAuth) usam o mesmo segredo da sessao.
  await app.register(fastifyCookie, { secret: env.sessionSecret });

  registerAuthPlugin(app, env);
  registerAuthRoutes(app, env);

  app.get<{ Reply: HealthResponse }>("/api/health", async () => {
    return { status: "ok" };
  });

  // Depois das rotas de API: o fallback de SPA so deve pegar o que sobrar.
  await registerStaticClient(app);

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    logger.info("server.started", { port: env.port });
  } catch (error) {
    logger.error("server.start_failed", error);
    process.exit(1);
  }
}

void main();
