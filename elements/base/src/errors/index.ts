/**
 * Shared error types for apps and cloud services.
 */

export class AltrError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "ALTR_ERROR", status = 500) {
    super(message);
    this.name = "AltrError";
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AltrError {
  constructor(message = "Not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AltrError {
  constructor(message = "Validation failed") {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export function isAltrError(error: unknown): error is AltrError {
  return error instanceof AltrError;
}
