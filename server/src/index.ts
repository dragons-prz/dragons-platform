import fastifyCookie from "@fastify/cookie";
import Fastify from "fastify";

import { createRequireAuth, registerAuthPlugin } from "./auth/plugin.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { loadEnv } from "./config/env.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerGuildRoutes } from "./routes/guild.js";
import { registerPanelRoutes } from "./routes/panels.js";
import { registerPresenceRoutes } from "./routes/presence.js";
import { registerSupportCategoryRoutes } from "./routes/support-categories.js";
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

  // Escopo encapsulado: o preHandler requireAuth so se aplica as rotas
  // registradas dentro deste plugin (paineis, config e recursos da guild),
  // nunca as rotas publicas (health, auth) registradas fora dele.
  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", createRequireAuth(env));
    registerPanelRoutes(protectedApp, env);
    registerConfigRoutes(protectedApp, env);
    registerGuildRoutes(protectedApp, env);
    registerSupportCategoryRoutes(protectedApp, env);
    registerPresenceRoutes(protectedApp);
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
