import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GENERIC_LOGIN_ERROR, mapLoginFailure } from "./login-errors";
import {
  DASHBOARD_PATH,
  LOGIN_PATH,
  isPublicAuthPath,
  loginRedirectPath,
  postLoginPath,
} from "./paths";

describe("auth paths", () => {
  it("treats login routes as public", () => {
    expect(isPublicAuthPath("/auth/login")).toBe(true);
    expect(isPublicAuthPath("/login")).toBe(true);
    expect(isPublicAuthPath("/jobs")).toBe(false);
    expect(isPublicAuthPath("/dashboard")).toBe(false);
  });

  it("sends unauthenticated /jobs to login", () => {
    expect(loginRedirectPath("/jobs")).toBe("/auth/login?next=%2Fjobs");
  });

  it("rejects open-redirect next values", () => {
    expect(postLoginPath("https://evil.example")).toBe(DASHBOARD_PATH);
    expect(postLoginPath("//evil.example")).toBe(DASHBOARD_PATH);
    expect(postLoginPath("/jobs")).toBe("/jobs");
    expect(postLoginPath(undefined)).toBe(DASHBOARD_PATH);
  });
});

describe("login errors", () => {
  it("does not expose whether an email exists", () => {
    expect(mapLoginFailure()).toBe(GENERIC_LOGIN_ERROR);
  });
});

describe("client bundle isolation", () => {
  it("keeps the service-role key out of the browser client", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/supabase/browser.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/SERVICE_ROLE/);
    expect(source).not.toMatch(/serviceRoleKey/);
  });

  it("keeps the admin client server-only", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/supabase/admin.ts"),
      "utf8",
    );
    expect(source).toMatch(/import "server-only"/);
    expect(source).toMatch(/getServerSupabaseEnv/);
  });
});

describe("public routes", () => {
  it("uses /auth/login as the canonical login path", () => {
    expect(LOGIN_PATH).toBe("/auth/login");
  });
});
