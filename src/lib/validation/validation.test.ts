import { describe, expect, it } from "vitest";

import { AppError, fail, ok } from "@/lib/api/result";
import { parseOrThrow } from "@/lib/validation";
import {
  isoDateSchema,
  moneyPositiveSchema,
  moneySchema,
  paginationSchema,
  searchSchema,
  signedMoneySchema,
  thanSchema,
  uuidSchema,
  weightSchema,
} from "@/lib/validation/schemas";

describe("uuidSchema", () => {
  it("accepts a UUID", () => {
    expect(parseOrThrow(uuidSchema, "11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("rejects a malformed UUID", () => {
    expect(() => parseOrThrow(uuidSchema, "not-a-uuid")).toThrow(AppError);
    expect(() => parseOrThrow(uuidSchema, "11111111-1111-4111-8111-11111111111")).toThrow(
      /valid record id/i,
    );
  });
});

describe("numeric schemas", () => {
  it("rejects negative money, than, and weight", () => {
    expect(() => parseOrThrow(moneySchema, "-1")).toThrow(AppError);
    expect(() => parseOrThrow(moneyPositiveSchema, "-0.01")).toThrow(AppError);
    expect(() => parseOrThrow(thanSchema, "-1.5")).toThrow(AppError);
    expect(() => parseOrThrow(weightSchema, "-0.001")).toThrow(AppError);
  });

  it("rejects zero than and zero positive money", () => {
    expect(() => parseOrThrow(thanSchema, "0")).toThrow(AppError);
    expect(() => parseOrThrow(moneyPositiveSchema, "0")).toThrow(AppError);
  });

  it("accepts signed opening-balance money and rejects extra decimals", () => {
    expect(parseOrThrow(signedMoneySchema, "-10.25")).toBe("-10.25");
    expect(parseOrThrow(signedMoneySchema, "0")).toBe("0");
    expect(() => parseOrThrow(signedMoneySchema, "1.234")).toThrow(AppError);
  });

  it("accepts zero weight and zero price", () => {
    expect(parseOrThrow(weightSchema, "0")).toBe("0");
    expect(parseOrThrow(moneySchema, "0.00")).toBe("0.00");
  });

  it("rejects too many decimal places", () => {
    expect(() => parseOrThrow(thanSchema, "1.2345")).toThrow(AppError);
    expect(() => parseOrThrow(moneySchema, "1.234")).toThrow(AppError);
  });
});

describe("paginationSchema", () => {
  it("defaults to page 1 and pageSize 30", () => {
    expect(parseOrThrow(paginationSchema, {})).toEqual({ page: 1, pageSize: 30 });
  });

  it("rejects a huge page size", () => {
    expect(() => parseOrThrow(paginationSchema, { page: 1, pageSize: 1_000_000 })).toThrow(
      AppError,
    );
    try {
      parseOrThrow(paginationSchema, { pageSize: 101 });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION");
    }
  });

  it("always uses the fixed page size of 30", () => {
    for (const pageSize of [10, 20, 30, 50]) {
      expect(parseOrThrow(paginationSchema, { pageSize })).toEqual({ page: 1, pageSize: 30 });
    }
  });
});

describe("search and dates", () => {
  it("trims search and rejects overlong search", () => {
    expect(parseOrThrow(searchSchema, "  J01  ")).toBe("J01");
    expect(() => parseOrThrow(searchSchema, "x".repeat(101))).toThrow(AppError);
  });

  it("rejects invalid dates", () => {
    expect(parseOrThrow(isoDateSchema, "2026-08-15")).toBe("2026-08-15");
    expect(() => parseOrThrow(isoDateSchema, "15-08-2026")).toThrow(AppError);
    expect(() => parseOrThrow(isoDateSchema, "2026-02-31")).toThrow(AppError);
  });
});

describe("result helpers", () => {
  it("wraps success and failure payloads", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
    expect(fail("NOT_FOUND", "Party was not found.")).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Party was not found." },
    });
  });
});
