export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTEGRITY"
  | "RATE_LIMIT"
  | "INTERNAL";

export type ActionError = {
  code: AppErrorCode;
  message: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(code: AppErrorCode, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

export const SAFE_INTERNAL_MESSAGE = "Something went wrong. Try again.";
export const SAFE_UNAUTHORIZED_MESSAGE = "Please sign in.";
export const SAFE_FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";
