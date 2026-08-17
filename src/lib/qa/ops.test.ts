import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function read(relative: string) {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("OPS-002 production isolation", () => {
  it("keeps local, staging, and production as separate Supabase projects", () => {
    const env = read("docs/environments.md");
    expect(env).toMatch(/maruti-galaxy-local/);
    expect(env).toMatch(/maruti-galaxy-staging/);
    expect(env).toMatch(/maruti-galaxy-prod/);
    expect(env).toMatch(/must not be used for casual development/);
    expect(read("docs/PRODUCTION_RUNBOOK.md")).toMatch(/Do not reuse local or staging/);
  });

  it("blocks staging volume seed and non-local bootstrap on production", () => {
    const seed = read("supabase/seeds/seed_staging_volume.sql");
    const bootstrap = read("scripts/bootstrap-admin.mjs");
    expect(seed).toMatch(/SEED_VOLUME_FORBIDDEN_IN_PRODUCTION/);
    expect(seed).toMatch(/maruti\.environment/);
    expect(bootstrap).toMatch(/MARUTI_BOOTSTRAP_CONFIRM/);
    expect(bootstrap).not.toMatch(/console\.(?:log|error|info)\([^)]*\$\{password\}/);
  });

  it("does not silently adopt R-17 hosting or monitoring vendors", () => {
    const runbook = read("docs/PRODUCTION_RUNBOOK.md");
    expect(runbook).toMatch(/\[DECISION REQUIRED\] R-17/);
    expect(runbook).toMatch(/Do not add `vercel\.json`/);
    for (const file of ["vercel.json", "Dockerfile", "fly.toml", "netlify.toml", "railway.toml"]) {
      expect(existsSync(path.join(process.cwd(), file))).toBe(false);
    }
  });

  it("has no debug API endpoints", () => {
    expect(existsSync(path.join(process.cwd(), "src/app/api/export/entries/route.ts"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "src/app/api/debug"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/health"))).toBe(false);
  });
});
