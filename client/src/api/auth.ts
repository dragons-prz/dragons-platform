import type { AuthSession } from "@dragons/shared";

/** Sinaliza especificamente "sem sessao" (HTTP 401), distinto de um erro de rede/servidor. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Sessao invalida ou expirada");
    this.name = "UnauthenticatedError";
  }
}

export async function fetchCurrentSession(signal?: AbortSignal): Promise<AuthSession> {
  const response = await fetch("/api/auth/me", { credentials: "include", signal });

  if (response.status === 401) {
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    throw new Error(`Falha ao verificar sessao (HTTP ${response.status})`);
  }

  return (await response.json()) as AuthSession;
}

export async function logoutRequest(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Falha ao encerrar sessao (HTTP ${response.status})`);
  }
}

/** URL de navegacao (nao fetch) — o navegador precisa seguir os redirects do Discord. */
export const DISCORD_LOGIN_URL = "/api/auth/discord";
