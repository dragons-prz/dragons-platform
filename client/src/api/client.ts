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
  return handleResponse<T>(response);
}

async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  });
  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new ApiUnauthenticatedError();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    const message = body?.error ?? `Falha ao salvar dados (HTTP ${response.status})`;

    if (response.status === 404) {
      throw new ApiNotFoundError(message);
    }

    throw new ApiError(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** POST autenticado — usado para criar recursos. */
export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiSend<T>(path, "POST", body, signal);
}

/** PUT autenticado — usado para substituir um recurso inteiro. */
export function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiSend<T>(path, "PUT", body, signal);
}

/** PATCH autenticado — usado para atualizar campos parciais de um recurso. */
export function apiPatch<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiSend<T>(path, "PATCH", body, signal);
}

/** DELETE autenticado. */
export function apiDelete(path: string, signal?: AbortSignal): Promise<void> {
  return apiSend<void>(path, "DELETE", undefined, signal);
}
