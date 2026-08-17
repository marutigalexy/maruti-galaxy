import {
  AppError,
  SAFE_FORBIDDEN_MESSAGE,
  SAFE_INTERNAL_MESSAGE,
  SAFE_UNAUTHORIZED_MESSAGE,
  isAppError,
  type ActionError,
  type AppErrorCode,
} from "@/lib/api/result";
import { logServerError } from "@/lib/api/logging";

const RPC_MESSAGES: Record<string, string> = {
  THAN_EXCEEDED: "Sub Job Than exceeds remaining Main Job Than.",
  DONE_THAN_EXCEEDED: "Done Than exceeds remaining Sub Job Than.",
  THAN_BELOW_SUB_JOBS: "Job Than cannot be less than allocated sub-job Than.",
  THAN_BELOW_WORK: "Sub Job Than cannot be less than completed Done Than.",
  AMOUNT_BELOW_ALLOCATIONS: "Invoice amount cannot be less than allocated income.",
  ENTRY_OVER_ALLOCATED: "Allocation exceeds remaining entry amount.",
  INVOICE_OVER_ALLOCATED: "Allocation exceeds remaining invoice amount.",
  EXPENSE_ALLOCATION_BLOCKED: "Only Income entries can be allocated to invoices.",
  ACCOUNT_INACTIVE: "Cannot create an entry under an inactive account.",
  CATEGORY_INACTIVE: "Cannot create an entry under an inactive category.",
  ENTRY_CATEGORY_TYPE_MISMATCH: "Entry type must match the category type.",
  CATEGORY_TYPE_IN_USE: "This category type cannot be changed because it has entries.",
  LOT_NUMBER_IMMUTABLE: "Lot Number cannot be changed.",
  USE_CREATE_JOB_WITH_INVOICE: "Jobs must be created together with their invoice.",
  INVOICE_NUMBER_IMMUTABLE: "Invoice number cannot be changed.",
  INVOICE_JOB_IMMUTABLE: "Invoice job cannot be changed.",
  VALIDATION_FAILED: "Invalid input.",
  PARTY_INACTIVE: "Cannot create a job for an inactive party.",
  EMPLOYEE_INACTIVE: "Cannot record work for an inactive employee.",
  PARTY_NOT_FOUND: "Party was not found.",
  JOB_NOT_FOUND: "Job was not found.",
  SUB_JOB_NOT_FOUND: "Sub-job was not found.",
  EMPLOYEE_NOT_FOUND: "Employee was not found.",
  INVOICE_NOT_FOUND: "Invoice was not found.",
  ENTRY_NOT_FOUND: "Entry was not found.",
  WORK_NOT_FOUND: "Work record was not found.",
  ACCOUNT_NOT_FOUND: "Account was not found.",
  CATEGORY_NOT_FOUND: "Category was not found.",
};

const VALIDATION_RPC = new Set([
  "VALIDATION_FAILED",
  "ACCOUNT_INACTIVE",
  "CATEGORY_INACTIVE",
  "ENTRY_CATEGORY_TYPE_MISMATCH",
  "PARTY_INACTIVE",
  "EMPLOYEE_INACTIVE",
]);

function looksUnsafe(message: string): boolean {
  return /select\s|insert\s|update\s|delete\s|from\s|postgres|supabase|stack|\/users\/|password|service.role|authorization/i.test(
    message,
  );
}

function postgresCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
}

function postgresMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return undefined;
}

function rpcCode(rpc: string): AppErrorCode {
  if (rpc.endsWith("_NOT_FOUND")) {
    return "NOT_FOUND";
  }

  if (VALIDATION_RPC.has(rpc)) {
    return "VALIDATION";
  }

  return "INTEGRITY";
}

export function mapToActionError(error: unknown): ActionError {
  if (isAppError(error)) {
    if (error.code === "INTERNAL" || looksUnsafe(error.message)) {
      logServerError("unsafe_or_internal_error", error, { code: error.code });
      return { code: "INTERNAL", message: SAFE_INTERNAL_MESSAGE };
    }

    return { code: error.code, message: error.message };
  }

  const code = postgresCode(error);
  const message = postgresMessage(error) ?? (error instanceof Error ? error.message : undefined);

  if (code === "429" || code === "RATE_LIMIT") {
    return { code: "RATE_LIMIT", message: "Too many requests. Try again later." };
  }

  if (message && RPC_MESSAGES[message]) {
    return { code: rpcCode(message), message: RPC_MESSAGES[message] };
  }

  if (code === "23505") {
    return { code: "CONFLICT", message: "This record already exists." };
  }

  if (code === "23503") {
    return { code: "INTEGRITY", message: "This record is in use and cannot be changed that way." };
  }

  if (code === "42501") {
    return { code: "FORBIDDEN", message: SAFE_FORBIDDEN_MESSAGE };
  }

  if (code === "22P02" || code === "22023") {
    return { code: "VALIDATION", message: "Invalid input." };
  }

  logServerError("unmapped_error", error);
  return { code: "INTERNAL", message: SAFE_INTERNAL_MESSAGE };
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    if (error.code === "INTERNAL" || looksUnsafe(error.message)) {
      return new AppError("INTERNAL", SAFE_INTERNAL_MESSAGE);
    }
    return error;
  }

  const mapped = mapToActionError(error);
  return new AppError(mapped.code, mapped.message);
}

export function publicAuthError(code: ActionError["code"]): ActionError {
  if (code === "UNAUTHORIZED") {
    return { code, message: SAFE_UNAUTHORIZED_MESSAGE };
  }
  if (code === "FORBIDDEN") {
    return { code, message: SAFE_FORBIDDEN_MESSAGE };
  }
  return { code: "INTERNAL", message: SAFE_INTERNAL_MESSAGE };
}
