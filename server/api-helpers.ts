import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "BUSINESS_RULE"
  | "AUTOMATION_FAILED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  BUSINESS_RULE: 422,
  AUTOMATION_FAILED: 422,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function errorResponse(
  code: ErrorCode,
  message?: string,
  details?: unknown
) {
  return NextResponse.json(
    { error: message ?? code, code, ...(details ? { details } : {}) },
    { status: STATUS[code] }
  );
}

export function badRequest(error: ZodError | string) {
  if (typeof error === "string") return errorResponse("VALIDATION", error);
  return errorResponse("VALIDATION", "Dados inválidos", error.flatten());
}

export const unauthorized = (message = "Não autenticado") =>
  errorResponse("UNAUTHORIZED", message);

export const forbidden = (message = "Sem permissão") =>
  errorResponse("FORBIDDEN", message);

export const notFound = (message = "Não encontrado") =>
  errorResponse("NOT_FOUND", message);

export const conflict = (message = "Conflito") =>
  errorResponse("CONFLICT", message);

export const internal = (message = "Erro inesperado") =>
  errorResponse("INTERNAL", message);

export function handleApiError(err: unknown, scope: string) {
  if (err instanceof ApiError) {
    return errorResponse(err.code, err.message, err.details);
  }
  console.error(`[${scope}]`, err);
  return internal();
}
