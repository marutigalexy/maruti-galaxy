import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseOrThrow } from "@/lib/validation";
import {
  createUserSchema,
  listUsersSchema,
  setUserActiveSchema,
  updateUserPasswordSchema,
} from "@/lib/validation/users";

describe("user schemas", () => {
  it("requires name, email, and matching passwords", () => {
    expect(() =>
      parseOrThrow(createUserSchema, {
        name: "",
        email: "admin@example.com",
        password: "secret1",
        confirmPassword: "secret1",
      }),
    ).toThrow(/Name is required/);

    expect(() =>
      parseOrThrow(createUserSchema, {
        name: "Admin",
        email: "not-an-email",
        password: "secret1",
        confirmPassword: "secret1",
      }),
    ).toThrow(/valid email/);

    expect(() =>
      parseOrThrow(createUserSchema, {
        name: "Admin",
        email: "admin@example.com",
        password: "secret1",
        confirmPassword: "other",
      }),
    ).toThrow(/do not match/);
  });

  it("lowercases email and ignores extra role fields", () => {
    const parsed = parseOrThrow(createUserSchema, {
      name: " Admin User ",
      email: "Admin@Example.com",
      password: "secret1",
      confirmPassword: "secret1",
      role: "super-admin",
      password_hash: "should-not-land",
    });

    expect(parsed.email).toBe("admin@example.com");
    expect(parsed.name).toBe("Admin User");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("password_hash");
  });

  it("rejects a password update that includes an old password field by ignoring it", () => {
    const parsed = parseOrThrow(updateUserPasswordSchema, {
      id: "11111111-1111-4111-8111-111111111111",
      password: "new-secret",
      confirmPassword: "new-secret",
      oldPassword: "legacy",
    });
    expect(parsed).not.toHaveProperty("oldPassword");
  });

  it("parses list filters and rejects a huge page size", () => {
    expect(parseOrThrow(listUsersSchema, {})).toMatchObject({
      page: 1,
      pageSize: 20,
      search: "",
      status: "all",
    });
    expect(() => parseOrThrow(listUsersSchema, { pageSize: 1000 })).toThrow();
  });

  it("requires a uuid to change active status", () => {
    expect(() => parseOrThrow(setUserActiveSchema, { id: "nope", is_active: false })).toThrow(
      /valid record id/i,
    );
  });
});

describe("users service security", () => {
  const service = readFileSync(
    path.join(process.cwd(), "src/services/users/users-service.ts"),
    "utf8",
  );
  const view = readFileSync(
    path.join(process.cwd(), "src/components/users/users-view.tsx"),
    "utf8",
  );
  const actions = readFileSync(path.join(process.cwd(), "src/app/actions/users.ts"), "utf8");

  it("creates Auth first, upserts name+email only, and compensates on profile failure", () => {
    expect(service).toMatch(/auth\.admin\.createUser/);
    expect(service).toMatch(/rollbackAuthUser/);
    expect(service).toMatch(/deleteUser/);
    expect(service).toMatch(/\.upsert\(/);
    expect(service).toMatch(/role: "admin"/);
    expect(service).toMatch(/onConflict: "id"/);
    expect(readFileSync(path.join(process.cwd(), "supabase/migrations/migration_04.sql"), "utf8")).toMatch(
      /on_auth_user_created/,
    );
  });

  it("does not delete Auth users on deactivate", () => {
    expect(service).toMatch(/You cannot deactivate your own account/);
    expect(service).toMatch(/is_active: input\.is_active/);
    expect(actions).toMatch(/requireActiveAdmin|createUser/);
    expect(service.indexOf("deleteUser")).toBe(service.lastIndexOf("deleteUser"));
  });

  it("never asks for the current password in the password dialog", () => {
    expect(view).toMatch(/The current password is never shown/);
    expect(view).not.toMatch(/oldPassword|htmlFor="old-password"|Old password/);
    expect(view).not.toMatch(/password_hash/);
  });

  it("re-authorizes inside server actions", () => {
    expect(actions).toMatch(/parseOrThrow\(createUserSchema/);
    expect(actions).toMatch(/parseOrThrow\(updateUserPasswordSchema/);
    expect(actions).toMatch(/parseOrThrow\(setUserActiveSchema/);
    expect(service).toMatch(/await requireActiveAdmin\(\)/);
  });
});
