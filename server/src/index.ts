import Fastify from "fastify";
import type { PanelJobStatus } from "@dragons/shared";

import { loadEnv } from "./config/env.js";
import { logger } from "./utils/logger.js";

interface HealthResponse {
  status: "ok";
}

// Uso deliberado de um tipo de @dragons/shared na resposta de health check:
// prova, em tempo de typecheck/build, que o server consome o pacote
// compartilhado corretamente. Nenhuma logica de painel real ainda.
const KNOWN_PANEL_JOB_STATUSES: readonly PanelJobStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed"
];

async function main(): Promise<void> {
  const env = loadEnv();
  const app = Fastify({ logger: false });

  app.get<{ Reply: HealthResponse }>("/api/health", async () => {
    return { status: "ok" };
  });

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    logger.info("server.started", {
      port: env.port,
      knownPanelJobStatuses: KNOWN_PANEL_JOB_STATUSES
    });
  } catch (error) {
    logger.error("server.start_failed", error);
    process.exit(1);
  }
}

void main();
