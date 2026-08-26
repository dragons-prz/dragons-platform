/**
 * Erro generico de chamada de API — carrega a mensagem legivel que o
 * servidor devolveu (nunca stack trace, ver `server/src/routes/respond-error.ts`).
 */
export class ApiError extends Error {}

/** Sinaliza especificamente "sem sessao" (HTTP 401), distinto de outros erros. */
export class ApiUnauthenticatedError extends ApiError {
  constructor() {
    super("Sessao invalida ou expirada");
    this.name = "ApiUnauthenticatedError";
  }
}

/** Sinaliza recurso inexistente (HTTP 404). */
export class ApiNotFoundError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "ApiNotFoundError";
  }
}

interface ErrorBody {
  error?: string;
}

/** GET autenticado com tratamento de erro consistente para toda a API do painel. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { credentials: "include", signal });

  if (response.status === 401) {
    throw new ApiUnauthenticatedError();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    const message = body?.error ?? `Falha ao carregar dados (HTTP ${response.status})`;

    if (response.status === 404) {
      throw new ApiNotFoundError(message);
    }

    throw new ApiError(message);
  }

  return (await response.json()) as T;
}
