import type { FastifyReply } from "fastify";

import { logger } from "../utils/logger.js";

/** Erro com um `status` HTTP explicito (ex.: `ValidationError`, `NotFoundError`, `DiscordApiError`). */
interface HttpError extends Error {
  status: number;
}

function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && typeof (error as { status?: unknown }).status === "number";
}

/**
 * Responde um erro em JSON com mensagem legivel, nunca stack trace —
 * usado por todas as rotas desta fase. Loga o detalhe completo no
 * servidor (com stack) mas devolve so a mensagem ao cliente.
 *
 * Erros que carregam seu proprio `status` HTTP (validacao, "nao
 * encontrado", API do Discord) repassam esse status quando esta na faixa
 * 4xx; qualquer outro erro (Firestore, bug interno) vira 500 generico.
 */
export async function respondError(
  reply: FastifyReply,
  event: string,
  error: unknown
): Promise<void> {
  logger.error(event, error);

  const status =
    isHttpError(error) && error.status >= 400 && error.status < 500 ? error.status : 500;
  const message = error instanceof Error ? error.message : "Erro inesperado no servidor.";
  await reply.code(status).send({ error: message });
}
