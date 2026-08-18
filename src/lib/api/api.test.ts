import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAction } from "@/lib/api/action";
import { sanitizeForLog } from "@/lib/api/logging";
import { mapToActionError } from "@/lib/api/map-error";
import {
  ALLOWED_PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  clampPageSize,
  paginated,
  paginationOffset,
} from "@/lib/api/pagination";
import { createRequestId, resolveRequestId } from "@/lib/api/request-id";
import { AppError, SAFE_INTERNAL_MESSAGE } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clampPageSize", () => {
  it("defaults invalid sizes and caps at 50", () => {
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(1000)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(20)).toBe(20);
  });

  it("matches the UI allow-list and security max", () => {
    expect(ALLOWED_PAGE_SIZES).toEqual([10, 20, 50]);
    expect(MAX_PAGE_SIZE).toBe(50);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("builds a paginated envelope", () => {
    expect(paginationOffset(2, 20)).toBe(20);
    expect(paginated(["a"], 21, 2, 20)).toEqual({
      records: ["a"],
      page: 2,
      pageSize: 20,
      totalCount: 21,
    });
  });
});

describe("mapToActionError", () => {
  it("does not return SQL or stack traces to the client", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const sql = mapToActionError({
      code: "42P01",
      message: 'relation "users" does not exist',
    });
    expect(sql).toEqual({ code: "INTERNAL", message: SAFE_INTERNAL_MESSAGE });
    expect(sql.message).not.toMatch(/relation|select|postgres/i);

    const stack = mapToActionError(new Error("select * from invoices\n    at Object.<anonymous>"));
    expect(stack).toEqual({ code: "INTERNAL", message: SAFE_INTERNAL_MESSAGE });
    expect(JSON.stringify(stack)).not.toMatch(/at Object/);
  });

  it("maps known RPC and constraint failures", () => {
    expect(mapToActionError({ message: "THAN_BELOW_WORK" })).toEqual({
      code: "INTEGRITY",
      message: "Sub Job Than cannot be less than completed Done Than.",
    });
    expect(mapToActionError({ message: "ACCOUNT_INACTIVE" })).toEqual({
      code: "VALIDATION",
      message: "Cannot create an entry under an inactive account.",
    });
    expect(mapToActionError({ message: "JOB_NOT_FOUND" })).toEqual({
      code: "NOT_FOUND",
      message: "Job was not found.",
    });
    expect(mapToActionError({ code: "23505", message: "duplicate key" })).toEqual({
      code: "CONFLICT",
      message: "This record already exists.",
    });
    expect(mapToActionError({ code: "429", message: "slow down" })).toEqual({
      code: "RATE_LIMIT",
      message: "Too many requests. Try again later.",
    });
  });

  it("keeps safe AppError messages", () => {
    expect(mapToActionError(new AppError("UNAUTHORIZED", "Please sign in."))).toEqual({
      code: "UNAUTHORIZED",
      message: "Please sign in.",
    });
  });
});

describe("sanitizeForLog", () => {
  it("never logs passwords or tokens", () => {
    expect(
      sanitizeForLog({
        password: "super-secret",
        token: "abc",
        authorization: "Bearer xyz",
        serviceRoleKey: "service-role-value",
        email: "admin@example.com",
      }),
    ).toEqual({
      password: "[REDACTED]",
      token: "[REDACTED]",
      authorization: "[REDACTED]",
      serviceRoleKey: "[REDACTED]",
      email: "admin@example.com",
    });
  });

  it("redacts JWT-shaped strings", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signature";
    expect(sanitizeForLog(jwt)).toBe("[REDACTED]");
  });
});

describe("selectColumns", () => {
  it("joins explicit columns and rejects SELECT *", () => {
    expect(selectColumns(["id", "name"])).toBe("id, name");
    expect(() => selectColumns(["*"])).toThrow(/SELECT \*/);
    expect(() => selectColumns(["id, *"])).toThrow(/SELECT \*/);
    expect(() => selectColumns([])).toThrow(/At least one column/);
  });
});

describe("correlation id", () => {
  it("creates a UUID request id", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(resolveRequestId("  incoming-id  ")).toBe("incoming-id");
    expect(resolveRequestId(null)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("stamps x-request-id in the route proxy", () => {
    const proxy = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
    const requestId = readFileSync(
      path.join(process.cwd(), "src/lib/api/request-id.ts"),
      "utf8",
    );
    expect(proxy).toMatch(/REQUEST_ID_HEADER/);
    expect(requestId).toMatch(/x-request-id/);
  });
});

describe("runAction", () => {
  it("returns mapped failures instead of throwing", async () => {
    const result = await runAction(async () => {
      throw new AppError("NOT_FOUND", "Party was not found.");
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Party was not found." },
    });
  });
});

describe("explicit select usage", () => {
  it("keeps the admin profile read on an explicit column list", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/permissions/require-active-admin.ts"),
      "utf8",
    );
    expect(source).toMatch(/selectColumns/);
    expect(source).not.toMatch(/\.select\("\*"\)/);
  });
});
