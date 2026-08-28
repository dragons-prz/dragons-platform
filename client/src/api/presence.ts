import type { PresenceResponse } from "@dragons/shared";

import { apiGet, apiPost } from "./client";

/**
 * Heartbeat: informa em que tela o usuario esta e recebe de volta a lista
 * de quem mais esta online. Chamado periodicamente pelo `PresenceContext`.
 */
export function sendPresenceHeartbeat(
  location: string,
  signal?: AbortSignal
): Promise<PresenceResponse> {
  return apiPost<PresenceResponse>("/api/presence", { location }, signal);
}

export function fetchPresence(signal?: AbortSignal): Promise<PresenceResponse> {
  return apiGet<PresenceResponse>("/api/presence", signal);
}

/**
 * Remove a presenca na hora ao fechar a aba. Usa `keepalive` porque o
 * request precisa sobreviver ao unload da pagina; erros sao ignorados
 * (o TTL do servidor limpa de qualquer forma).
 */
export function dropPresenceOnUnload(): void {
  try {
    void fetch("/api/presence", { method: "DELETE", credentials: "include", keepalive: true });
  } catch {
    // best-effort — sem sessao/rede o servidor expira sozinho
  }
}
