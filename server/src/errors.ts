/**
 * Erros HTTP com status e mensagem legivel em portugues, prontos para
 * `respondError` (ver `routes/respond-error.ts`) devolver ao client sem
 * nunca vazar stack trace.
 */

export class ValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
