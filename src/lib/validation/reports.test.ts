import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { queryHref } from "@/lib/api/query-href";
import { currentMonthRange } from "@/lib/dates/month";
import { NAV_ITEMS } from "@/lib/navigation/nav";
import { parseOrThrow } from "@/lib/validation";
import {
  jobWorkReportSchema,
  profitLossSchema,
  salaryReportSchema,
} from "@/lib/validation/reports";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("report schemas", () => {
  it("rejects Date From after Date To and strips extra P&L lines", () => {
    expect(() =>
      parseOrThrow(jobWorkReportSchema, { date_from: "2026-02-01", date_to: "2026-01-01" }),
    ).toThrow(/Date From cannot be after Date To/);

    const parsed = parseOrThrow(profitLossSchema, {
      date_from: "2026-08-01",
      date_to: "2026-08-17",
      cogs: "99",
      depreciation: "10",
    });
    expect(parsed).toEqual({ date_from: "2026-08-01", date_to: "2026-08-17" });
    expect(parsed).not.toHaveProperty("cogs");
  });

  it("parses salary filters", () => {
    expect(parseOrThrow(salaryReportSchema, { employee_id: UUID })).toMatchObject({
      employee_id: UUID,
      page: 1,
      pageSize: 20,
    });
  });
});

describe("current month range", () => {
  it("starts on the first calendar day in Asia/Kolkata", () => {
    const range = currentMonthRange(new Date("2026-08-17T02:00:00Z"));
    expect(range.date_from).toBe("2026-08-01");
    expect(range.date_to).toMatch(/^2026-08-/);
  });
});

describe("queryHref", () => {
  it("omits all-values, empty strings, and default pagination", () => {
    expect(
      queryHref("/reports/entries", {
        search: "",
        entry_type: "all",
        page: 1,
        pageSize: 20,
        party_id: UUID,
      }),
    ).toBe(`/reports/entries?party_id=${UUID}`);
  });
});

describe("report and dashboard security", () => {
  const reports = readFileSync(
    path.join(process.cwd(), "src/services/reports/reports-service.ts"),
    "utf8",
  );
  const dashboard = readFileSync(
    path.join(process.cwd(), "src/services/dashboard/dashboard-service.ts"),
    "utf8",
  );
  const jobView = readFileSync(
    path.join(process.cwd(), "src/components/reports/job-work-report-view.tsx"),
    "utf8",
  );
  const ledgerView = readFileSync(
    path.join(process.cwd(), "src/components/reports/entry-report-view.tsx"),
    "utf8",
  );
  const plView = readFileSync(
    path.join(process.cwd(), "src/components/reports/profit-loss-view.tsx"),
    "utf8",
  );
  const dashView = readFileSync(
    path.join(process.cwd(), "src/components/dashboard/dashboard-view.tsx"),
    "utf8",
  );
  const revalidate = readFileSync(path.join(process.cwd(), "src/lib/api/revalidate.ts"), "utf8");
  const dashboardSql = readFileSync(
    path.join(process.cwd(), "supabase/migrations/migration_03.sql"),
    "utf8",
  );

  it("aggregates on the server from source tables and views", () => {
    expect(reports).toMatch(/from\("job_works"\)/);
    expect(reports).toMatch(/from\("sub_jobs"\)/);
    expect(reports).toMatch(/from\("sub_job_employee_work"\)/);
    expect(reports).toMatch(/getEntryReport[\s\S]*return listEntries/);
    expect(reports).toMatch(/getOutstandingReport[\s\S]*return listInvoices/);
    expect(reports).toMatch(/getProfitLossReport[\s\S]*listEntries/);
    expect(reports).toMatch(/entry_type", "Expense"/);
    expect(reports).not.toMatch(/createSupabaseAdminClient/);
    expect(reports.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(dashboard).toMatch(/rpc\("dashboard_kpis"/);
    expect(dashboard).toMatch(/from\("v_account_balances"\)/);
    expect(dashboard).toMatch(/\.limit\(8\)/);
    expect(dashboard).toMatch(/currentMonthRange/);
    expect(dashboard).toMatch(/await requireActiveAdmin\(\)/);
    expect(dashboard).not.toMatch(/createSupabaseAdminClient/);
    expect(dashboard).not.toMatch(/from\("job_works"\)\.select\("than"\)/);
    expect(dashboardSql).toMatch(/SECURITY INVOKER/);
    expect(dashboardSql).toMatch(/search_path = public/);
    expect(dashboardSql).toMatch(/v_employee_earnings/);
    expect(dashboardSql).toMatch(/v_party_outstanding/);
    expect(dashboardSql).toMatch(/REVOKE ALL ON FUNCTION public\.dashboard_kpis\(date, date\) FROM anon/);
    expect(revalidate).toMatch(/"\/reports"/);
  });

  it("uses the v1 report columns and does not invent running balances or extra P&L lines", () => {
    expect(jobView).toMatch(/Lot Number/);
    expect(jobView).toMatch(/Done Than/);
    expect(jobView).toMatch(/Sub Jobs/);
    expect(ledgerView).not.toMatch(/Running Balance/);
    expect(plView).toMatch(/Income − Expenses/);
    expect(plView).not.toMatch(/COGS/);
    expect(plView).not.toMatch(/Depreciation/);
    expect(dashView).toMatch(/Total Jobs/);
    expect(dashView).toMatch(/Outstanding Amount/);
    expect(dashView).toMatch(/Recent Jobs/);
    expect(dashView).toMatch(/Recent Entries/);
    expect(dashView).toMatch(/This month/);
    expect(dashView).toMatch(/All time/);
    expect(dashView).toMatch(/date_from=\$\{snapshot\.month_from\}/);
    expect(dashView).toMatch(/\/reports\/outstanding/);
    expect(NAV_ITEMS.find((item) => item.label === "Reports")?.children?.map((child) => child.href)).toEqual([
      "/reports/jobs",
      "/reports/entries",
      "/reports/outstanding",
      "/reports/salary",
      "/reports/profit-loss",
    ]);
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/reports/layout.tsx"), "utf8")).toMatch(
      /ModuleTabs/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/accounting/layout.tsx"), "utf8")).toMatch(
      /ModuleTabs/,
    );
  });
});
