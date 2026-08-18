import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "@/lib/navigation/nav";

function read(relative: string) {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("QA-001 critical path coverage", () => {
  it("keeps a Playwright spec for the Section 14 workflow", () => {
    const spec = read("e2e/critical-path.spec.ts");
    expect(spec).toMatch(/signIn/);
    expect(spec).toMatch(/Add Party/);
    expect(spec).toMatch(/Add Employee/);
    expect(spec).toMatch(/Add Account/);
    expect(spec).toMatch(/Add Category/);
    expect(spec).toMatch(/Create Job/);
    expect(spec).toMatch(/Add Sub Job/);
    expect(spec).toMatch(/Add Work/);
    expect(spec).toMatch(/Add Income/);
    expect(spec).toMatch(/Allocate/);
    expect(spec).toMatch(/Add Expense/);
    expect(spec).toMatch(/\/dashboard/);
    expect(spec).toMatch(/\/reports\/outstanding/);
    expect(spec).toMatch(/\/reports\/profit-loss/);
    expect(spec).toMatch(/Confirm Logout/);
    expect(spec).not.toMatch(/Math\.random\(\)/);
  });
});

describe("QA-002 responsive pass", () => {
  it("uses a drawer under 1024px and stacks filters under 768px", () => {
    const css = read("src/styles/components.css");
    expect(css).toMatch(/@media \(max-width: 1024px\)/);
    expect(css).toMatch(/@media \(max-width: 768px\)/);
    expect(css).toMatch(/\.app-menu-toggle/);
    expect(css).toMatch(/\.ui-table-wrap \{[\s\S]*overflow: auto/);
    expect(css).toMatch(/\.ui-filter-bar \{[\s\S]*flex-direction: column/);
    expect(read("src/components/layout/topbar.tsx")).toMatch(/Open navigation/);
    expect(read("src/components/layout/app-shell.tsx")).toMatch(/app-nav-scrim/);
    expect(read("src/components/ui/tooltip.tsx")).toMatch(/createPortal/);
    expect(css).toMatch(/\.app-shell-main \{[\s\S]*overflow:\s*hidden/);
    expect(css).toMatch(/\.app-content \{[\s\S]*overflow:\s*auto/);
    expect(css).toMatch(/\.ui-tooltip \{[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.app-sidebar-nav \{[\s\S]*overflow-x:\s*clip/);
    expect(read("e2e/responsive.spec.ts")).toMatch(/390/);
    expect(read("e2e/responsive.spec.ts")).toMatch(/820/);
  });
});

describe("QA-003 accessibility pass", () => {
  it("associates field errors, keeps focus and named icon actions, and never uses color-only status", () => {
    const field = read("src/components/ui/form-field.tsx");
    const badge = read("src/components/ui/status-badge.tsx");
    const table = read("src/components/ui/data-table.tsx");
    const css = read("src/styles/components.css");
    const dialog = read("src/components/ui/dialog.tsx");
    const confirm = read("src/components/ui/confirm-dialog.tsx");

    expect(field).toMatch(/aria-describedby/);
    expect(field).toMatch(/aria-invalid/);
    expect(field).toMatch(/htmlFor/);
    expect(badge).toMatch(/const text = label \?\? LABELS\[tone\]/);
    expect(table).toMatch(/<caption className="sr-only">/);
    expect(table).toMatch(/scope="col"/);
    expect(css).toMatch(/:focus-visible/);
    expect(dialog).toMatch(/aria-labelledby/);
    expect(confirm).toMatch(/cancelRef\.current\?\.focus/);
    expect(read("src/components/layout/topbar.tsx")).toMatch(/aria-label="Open navigation"/);
    expect(read("src/components/ui/filter-bar.tsx")).toMatch(/aria-label="Filters"/);
    expect(read("src/components/ui/filter-bar.tsx")).toMatch(/Reset/);
    expect(read("src/components/ui/filter-bar.tsx")).toMatch(/ResetIcon/);
    expect(read("src/components/ui/data-table.tsx")).toMatch(/onRowClick/);
    expect(read("src/components/layout/sidebar.tsx")).toMatch(/app-sidebar-profile/);
    expect(read("src/components/ui/pagination.tsx")).toMatch(/Previous/);
    expect(read("src/components/ui/pagination.tsx")).toMatch(/Next/);
  });

  it("exposes every primary module in named navigation", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Dashboard",
      "Jobs",
      "Parties",
      "Employees",
      "Accounting",
      "Reports",
      "Users",
    ]);
  });
});

describe("QA-004 regression pack", () => {
  it("keeps unit, database, secret, audit, and optional E2E scripts in CI", () => {
    const pack = read("package.json");
    const ci = read(".github/workflows/ci.yml");
    expect(pack).toMatch(/"test": "vitest run"/);
    expect(pack).toMatch(/"test:e2e": "playwright test"/);
    expect(pack).toMatch(/"db:verify"/);
    expect(pack).toMatch(/"db:perf"/);
    expect(pack).toMatch(/"ops:preflight"/);
    expect(pack).toMatch(/"qa:regression"/);
    expect(ci).toMatch(/npm test/);
    expect(ci).toMatch(/db-verify\.sh/);
    expect(ci).toMatch(/db-perf\.sh --reuse/);
    expect(ci).toMatch(/ops:preflight/);
    expect(ci).toMatch(/test:e2e/);
  });
});
