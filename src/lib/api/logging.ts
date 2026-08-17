import { headers } from "next/headers";

import { REQUEST_ID_HEADER, createRequestId } from "@/lib/api/request-id";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /password|passwd|token|secret|authorization|cookie|service.?role|api.?key|access.?token|refresh.?token/i;

export { REQUEST_ID_HEADER, createRequestId } from "@/lib/api/request-id";

export async function getCorrelationId(): Promise<string> {
  try {
    const headerStore = await headers();
    return headerStore.get(REQUEST_ID_HEADER) ?? createRequestId();
  } catch {
    return createRequestId();
  }
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return "[Truncated]";
  }

  if (typeof value === "string") {
    if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\./.test(value)) {
      return REDACTED;
    }
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeForLog(value.message, depth + 1),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeForLog(nested, depth + 1);
    }
    return output;
  }

  return value;
}

function writeLog(
  level: "error" | "info",
  event: string,
  extra: Record<string, unknown>,
): void {
  const payload = {
    event,
    ...(sanitizeForLog(extra) as Record<string, unknown>),
  };

  void getCorrelationId()
    .then((requestId) => {
      const line = JSON.stringify({ requestId, ...payload });
      if (level === "error") {
        console.error(line);
      } else {
        console.info(line);
      }
    })
    .catch(() => {
      const line = JSON.stringify(payload);
      if (level === "error") {
        console.error(line);
      } else {
        console.info(line);
      }
    });
}

export function logServerError(event: string, error: unknown, extra?: Record<string, unknown>): void {
  writeLog("error", event, { error, ...(extra ?? {}) });
}

export function logSecurityEvent(event: string, extra?: Record<string, unknown>): void {
  writeLog("info", event, extra ?? {});
}
