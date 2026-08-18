import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { escapeIlike } from "@/lib/api/ilike";
import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaderMap,
  cspHeaderName,
} from "@/lib/security/headers";
import {
  EXPORT_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  clientIpFromHeaders,
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import { parseOrThrow } from "@/lib/validation";
import { searchSchema, uuidSchema } from "@/lib/validation/schemas";

describe("security headers", () => {
  it("uses report-only CSP in non-production and enforces CSP in production", () => {
    expect(cspHeaderName(false)).toBe("Content-Security-Policy-Report-Only");
    expect(cspHeaderName(true)).toBe("Content-Security-Policy");

    const production = buildSecurityHeaderMap({
      production: true,
      supabaseUrl: "https://example.supabase.co",
    });
    const development = buildSecurityHeaderMap({
      production: false,
      supabaseUrl: "https://example.supabase.co",
    });

    expect(production["Content-Security-Policy"]).toContain("script-src 'self'");
    expect(production["Content-Security-Policy"]).toContain("https://example.supabase.co");
    expect(production["Content-Security-Policy"]).toContain("wss://example.supabase.co");
    expect(production["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(production["X-Content-Type-Options"]).toBe("nosniff");
    expect(production["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(production["Permissions-Policy"]).toContain("camera=()");
    expect(development["Content-Security-Policy-Report-Only"]).toBeDefined();
    expect(development["Strict-Transport-Security"]).toBeUndefined();
    expect(buildContentSecurityPolicy()).toContain("connect-src 'self'");
    expect(buildContentSecurityPolicy()).not.toContain("*");
  });
});

describe("rate limiting", () => {
  it("blocks a login flood after the window limit", () => {
    const buckets = new Map();
    const now = 1_700_000_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i += 1) {
      expect(
        consumeRateLimit("login:1.1.1.1", LOGIN_RATE_LIMIT.limit, LOGIN_RATE_LIMIT.windowMs, now, buckets)
          .allowed,
      ).toBe(true);
    }
    const blocked = consumeRateLimit(
      "login:1.1.1.1",
      LOGIN_RATE_LIMIT.limit,
      LOGIN_RATE_LIMIT.windowMs,
      now + 1000,
      buckets,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates export buckets and reads the client IP", () => {
    const buckets = new Map();
    const now = 1_700_000_000_000;
    for (let i = 0; i < EXPORT_RATE_LIMIT.limit; i += 1) {
      expect(
        consumeRateLimit("export:2.2.2.2", EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, now, buckets)
          .allowed,
      ).toBe(true);
    }
    expect(
      consumeRateLimit("export:2.2.2.2", EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, now, buckets)
        .allowed,
    ).toBe(false);
    expect(
      consumeRateLimit("export:3.3.3.3", EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, now, buckets)
        .allowed,
    ).toBe(true);

    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.9, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.9");
  });
});

describe("cookie security", () => {
  it("sets HttpOnly, SameSite=Lax, and Secure only in production", () => {
    expect(sessionCookieOptions("development")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });
    expect(sessionCookieOptions("production")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    });
  });
});

describe("IDOR: lot and invoice numbers are not authorization", () => {
  const jobService = readFileSync(path.join(process.cwd(), "src/services/jobs/jobs-service.ts"), "utf8");
  const invoiceService = readFileSync(
    path.join(process.cwd(), "src/services/invoices/invoices-service.ts"),
    "utf8",
  );
  const jobPage = readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/jobs/[jobId]/page.tsx"),
    "utf8",
  );
  const printPage = readFileSync(
    path.join(process.cwd(), "src/app/(print)/invoices/[invoiceId]/print/page.tsx"),
    "utf8",
  );
  const proxy = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");

  it("looks up jobs and invoices by UUID after requireActiveAdmin", () => {
    expect(jobService).toMatch(/export async function getJob\([\s\S]*?\.eq\("id", id\)/);
    expect(jobService).not.toMatch(/export async function getJob\([\s\S]*?\.eq\("lot_number"/);
    expect(invoiceService).toMatch(/export async function getInvoice\([\s\S]*?\.eq\("id", id\)/);
    expect(invoiceService).not.toMatch(/export async function getInvoice\([\s\S]*?\.eq\("invoice_number"/);
    expect(jobPage).toMatch(/parseOrThrow\(uuidSchema, jobId\)/);
    expect(jobPage).toMatch(/getInvoice/);
    expect(printPage).toMatch(/parseOrThrow\(uuidSchema, invoiceId\)/);
    expect(jobPage).toMatch(/requireActiveAdmin/);
    expect(proxy).toMatch(/loginRedirectPath/);
  });

  it("rejects lot and invoice numbers as record ids", () => {
    expect(() => parseOrThrow(uuidSchema, "J01")).toThrow(/valid record id/i);
    expect(() => parseOrThrow(uuidSchema, "INV-0001")).toThrow(/valid record id/i);
    expect(() => parseOrThrow(uuidSchema, "J01-A")).toThrow(/valid record id/i);
  });
});

describe("XSS and SQLi suite", () => {
  it("escapes ILIKE wildcards and does not treat SQL payloads as UUIDs", () => {
    expect(escapeIlike("100%_off")).toBe("100\\%\\_off");
    expect(escapeIlike("' OR 1=1 --")).toBe("' OR 1=1 --");
    expect(() => parseOrThrow(uuidSchema, "' OR 1=1 --")).toThrow(/valid record id/i);
    expect(() => parseOrThrow(uuidSchema, "<script>alert(1)</script>")).toThrow(/valid record id/i);
    expect(() => parseOrThrow(searchSchema, "a".repeat(101))).toThrow(/100 characters/);
  });

  it("keeps search on the query builder and React text escaping", () => {
    const jobs = readFileSync(path.join(process.cwd(), "src/services/jobs/jobs-service.ts"), "utf8");
    const entries = readFileSync(
      path.join(process.cwd(), "src/services/entries/entries-service.ts"),
      "utf8",
    );
    const login = readFileSync(path.join(process.cwd(), "src/app/actions/auth.ts"), "utf8");
    const proxy = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
    const nextConfig = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    const server = readFileSync(path.join(process.cwd(), "src/lib/supabase/server.ts"), "utf8");

    expect(jobs).toMatch(/escapeIlike/);
    expect(jobs).toMatch(/\.ilike\("lot_number"/);
    expect(entries).toMatch(/escapeIlike/);
    expect(jobs).not.toMatch(/\$\{search\}/);
    expect(entries).not.toMatch(/\$\{input\.search\}/);
    expect(login).toMatch(/consumeLoginRateLimit/);
    expect(proxy).toMatch(/consumeExportRateLimit/);
    expect(proxy).toMatch(/consumeLoginRateLimit/);
    expect(nextConfig).toMatch(/nextSecurityHeaders/);
    expect(server).toMatch(/sessionCookieOptions/);
  });
});
