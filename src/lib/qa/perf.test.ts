import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function read(relative: string) {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("PERF-001 staging volume seed", () => {
  it("creates 1k jobs and 5k entries through real lot/invoice generators", () => {
    const seed = read("supabase/seeds/seed_staging_volume.sql");
    expect(seed).toMatch(/NEVER run this in production/);
    expect(seed).toMatch(/FOR v_i IN 1\.\.1000 LOOP/);
    expect(seed).toMatch(/generate_series\(1, 5000\)/);
    expect(seed).toMatch(/create_job_with_invoice/);
    expect(seed).toMatch(/SEED-VOLUME-PARTY/);
    expect(seed).not.toMatch(/createSupabaseAdminClient/);
    expect(seed).not.toMatch(/lot_number\s*,/);
    expect(read("package.json")).not.toMatch(/SEED-VOLUME-PARTY/);
  });
});

describe("PERF-002 list query indexes", () => {
  it("measures existing B-tree indexes and does not add trigram indexes", () => {
    const explain = read("supabase/tests/qa_perf.sql");
    const migration01 = read("supabase/migrations/migration_01.sql");
    expect(explain).toMatch(/EXPLAIN \(ANALYZE/);
    expect(explain).toMatch(/job_works_status_idx/);
    expect(explain).toMatch(/entries_account_id_idx/);
    expect(explain).toMatch(/no trigram indexes without measured need/);
    expect(explain).toMatch(/Execution Time: \(\[0-9\.\]\+\)/);
    expect(migration01).toMatch(/CREATE INDEX job_works_status_idx/);
    expect(read("supabase/migrations/migration_03.sql")).not.toMatch(/CREATE INDEX/);
  });
});

describe("PERF-004 list virtualization", () => {
  it("keeps server-side pagination and does not add a virtualizer", () => {
    const table = read("src/components/ui/data-table.tsx");
    const pack = read("package.json");
    expect(table).toMatch(/rows\.map\(/);
    expect(table).not.toMatch(/virtual/i);
    expect(table).not.toMatch(/react-window|react-virtuoso|@tanstack\/react-virtual/);
    expect(pack).not.toMatch(/react-window|react-virtuoso|@tanstack\/react-virtual/);
  });
});
