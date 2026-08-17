import { describe, expect, it } from "vitest";

import { evaluateAccess } from "./evaluate-access";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Admin User",
  email: "admin@example.com",
  role: "admin",
  is_active: true,
};

describe("evaluateAccess", () => {
  it("allows an active admin", () => {
    expect(evaluateAccess(base)).toEqual({ status: "ok", user: base });
  });

  it("rejects a missing profile", () => {
    expect(evaluateAccess(null)).toEqual({ status: "missing" });
  });

  it("rejects an inactive admin", () => {
    const row = { ...base, is_active: false };
    expect(evaluateAccess(row)).toEqual({ status: "inactive", user: row });
  });

  it("rejects a non-admin role", () => {
    const row = { ...base, role: "clerk" };
    expect(evaluateAccess(row)).toEqual({ status: "forbidden", user: row });
  });
});
