export class ApiError extends Error {
  status?: number;
  details?: unknown;
  raw?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown; raw?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.details = options?.details;
    this.raw = options?.raw;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function extractMessage(error: unknown): string | undefined {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (!isRecord(error)) {
    return undefined;
  }

  const nestedError = error.error;
  const nestedMessage = isRecord(nestedError) ? nestedError.message : undefined;

  return firstString([error.message, error.error, error.detail, error.title, nestedMessage]);
}

function extractStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const statusValue = error.status;
  if (typeof statusValue === "number" && Number.isFinite(statusValue)) {
    return statusValue;
  }
  return undefined;
}

export function normalizeApiError(error: unknown, context?: { status?: number; fallbackMessage?: string }): ApiError {
  if (error instanceof ApiError) {
    if (error.status === undefined && context?.status !== undefined) {
      error.status = context.status;
    }
    return error;
  }

  const message = extractMessage(error) ?? context?.fallbackMessage ?? "Request failed";
  const status = context?.status ?? extractStatus(error);

  return new ApiError(message, {
    status,
    details: isRecord(error) ? error : undefined,
    raw: error,
  });
}

export function getApiErrorMessage(error: unknown, fallbackMessage = "Unexpected error"): string {
  return normalizeApiError(error, { fallbackMessage }).message;
}
