import type { FastifyReply } from "fastify";

import { DiscordApiError } from "../discord/discord-client.js";
import { logger } from "../utils/logger.js";

/**
 * Responde um erro em JSON com mensagem legivel, nunca stack trace —
 * usado por todas as rotas de leitura desta fase. Loga o detalhe completo
 * no servidor (com stack) mas devolve so a mensagem ao cliente.
 *
 * Erros vindos da API do Discord repassam o status HTTP original quando
 * fizer sentido (ex.: 403 se o bot perdeu acesso); qualquer outro erro
 * (Firestore, bug interno) vira 500 generico.
 */
export async function respondError(
  reply: FastifyReply,
  event: string,
  error: unknown
): Promise<void> {
  logger.error(event, error);

  const status =
    error instanceof DiscordApiError && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  const message = error instanceof Error ? error.message : "Erro inesperado no servidor.";
  await reply.code(status).send({ error: message });
}
