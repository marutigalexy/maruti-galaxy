export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function resolveRequestId(existing: string | null | undefined): string {
  if (existing && existing.trim() !== "") {
    return existing.trim();
  }

  return createRequestId();
}
