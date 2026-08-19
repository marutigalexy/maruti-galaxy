import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { paginationControls } from "@/lib/api/pagination";
import { formatInr, formatWeightCt } from "@/lib/formatters";
import {
  breadcrumbsForPath,
  isNavActive,
  isRecordPath,
  NAV_ITEMS,
  pageTitleForPath,
  parentPath,
} from "@/lib/navigation/nav";
import { BRAND_COLORS } from "@/lib/theme/tokens";
import { debounce } from "@/lib/ui/debounce";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return walk(full);
    }
    return [full];
  });
}

describe("design tokens", () => {
  it("matches the reference UI palette", () => {
    expect(BRAND_COLORS.deepNavy).toBe("#011938");
    expect(BRAND_COLORS.darkNavy).toBe("#0F172A");
    expect(BRAND_COLORS.secondaryNavy).toBe("#083574");
    expect(BRAND_COLORS.diamondSilver).toBe("#94A3B8");
    expect(BRAND_COLORS.lightSilver).toBe("#F1F5F9");
    expect(BRAND_COLORS.pageBackground).toBe("#F8FAFC");
    expect(BRAND_COLORS.surface).toBe("#FFFFFF");
    expect(BRAND_COLORS.border).toBe("#E2E8F0");
    expect(BRAND_COLORS.primaryText).toBe("#1E293B");
    expect(BRAND_COLORS.secondaryText).toBe("#64748B");
  });

  it("defines a restrained radius scale and compact navigation icons", () => {
    const tokenCss = readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
    const componentCss = readFileSync(path.join(process.cwd(), "src/styles/components.css"), "utf8");

    expect(tokenCss).toContain("--radius-sm:");
    expect(tokenCss).toContain("--radius-md:");
    expect(tokenCss).toContain("--radius-lg:");
    expect(tokenCss).toContain("--icon-size-nav: 20px");
    expect(componentCss).toMatch(/\.app-nav-icon\s*\{[\s\S]*?width:\s*var\(--icon-size-nav\)/);
    expect(componentCss).toContain("border-radius: var(--radius-md)");
  });

  it("keeps hex values in the token files only", () => {
    const tokenCss = readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
    expect(tokenCss.toLowerCase()).toContain(BRAND_COLORS.deepNavy.toLowerCase());

    const componentFiles = [
      ...walk(path.join(process.cwd(), "src/components")),
      ...walk(path.join(process.cwd(), "src/app")),
    ].filter((file) => /\.(ts|tsx|css)$/.test(file) && !file.endsWith("tokens.css"));

    for (const file of componentFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });
});

describe("navigation", () => {
  it("includes the required sidebar items", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Dashboard",
      "Jobs",
      "Parties",
      "Employees",
      "Accounting",
      "Reports",
      "Users",
    ]);

    const accounting = NAV_ITEMS.find((item) => item.label === "Accounting");
    expect(accounting?.children?.map((child) => child.label)).toEqual([
      "Entries",
      "Accounts",
      "Categories",
    ]);
    expect(readFileSync(path.join(process.cwd(), "src/components/layout/sidebar.tsx"), "utf8")).not.toMatch(
      /app-nav-children/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/accounting/layout.tsx"), "utf8")).toMatch(
      /ModuleTabs/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/reports/layout.tsx"), "utf8")).toMatch(
      /ModuleTabs/,
    );
  });

  it("marks nested accounting routes as the accounting section", () => {
    expect(isNavActive("/accounting/entries", "/accounting")).toBe(true);
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/jobs", "/dashboard")).toBe(false);
    expect(pageTitleForPath("/accounting/accounts")).toBe("Accounts");
    expect(breadcrumbsForPath("/accounting/entries").map((item) => item.label)).toEqual([
      "Accounting",
      "Entries",
    ]);
    expect(
      breadcrumbsForPath("/parties/11111111-1111-4111-8111-111111111111").map((item) => item.label),
    ).toEqual(["Parties", "Detail"]);
    expect(
      breadcrumbsForPath("/jobs/new").map((item) => item.label),
    ).toEqual(["Jobs", "New"]);
    expect(
      breadcrumbsForPath("/jobs/11111111-1111-4111-8111-111111111111/edit").map((item) => item.label),
    ).toEqual(["Jobs", "Detail", "Edit"]);
  });

  it("treats record routes as detail paths with a parent back target", () => {
    expect(isRecordPath("/jobs")).toBe(false);
    expect(isRecordPath("/jobs/new")).toBe(true);
    expect(isRecordPath("/jobs/11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isRecordPath("/jobs/11111111-1111-4111-8111-111111111111/edit")).toBe(true);
    expect(isRecordPath("/reports/outstanding")).toBe(false);
    expect(parentPath("/jobs/new")).toBe("/jobs");
    expect(parentPath("/jobs/11111111-1111-4111-8111-111111111111/edit")).toBe(
      "/jobs/11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("formatters", () => {
  it("formats INR and carat weight", () => {
    expect(formatInr("1234.5")).toContain("1,234.50");
    expect(formatWeightCt("12.500")).toBe("12.500 ct");
  });
});

describe("pagination controls", () => {
  it("disables previous on the first page and next on the last page", () => {
    const first = paginationControls(1, 20, 25);
    expect(first.prevDisabled).toBe(true);
    expect(first.nextDisabled).toBe(false);

    const last = paginationControls(2, 20, 25);
    expect(last.prevDisabled).toBe(false);
    expect(last.nextDisabled).toBe(true);
  });
});

describe("search debounce", () => {
  it("delays emission", async () => {
    const calls: string[] = [];
    const emit = debounce((value: string) => {
      calls.push(value);
    }, 20);
    emit("J");
    emit("J0");
    emit("J01");
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(calls).toEqual(["J01"]);
  });

  it("cancels a pending emission", async () => {
    const calls: string[] = [];
    const emit = debounce((value: string) => {
      calls.push(value);
    }, 20);
    emit("J01");
    emit.cancel();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(calls).toEqual([]);
  });
});

describe("select menus", () => {
  it("uses a custom listbox with a selected checkmark", () => {
    const select = readFileSync(path.join(process.cwd(), "src/components/ui/select.tsx"), "utf8");
    expect(select).toMatch(/role="listbox"/);
    expect(select).toMatch(/CheckIcon/);
    expect(select).toMatch(/ui-select-menu/);
    expect(select).toMatch(/window\.showPopover|showPopover/);
  });
});

describe("loading states", () => {
  it("keeps table, KPI, and page skeletons plus button spinners", () => {
    const table = readFileSync(path.join(process.cwd(), "src/components/ui/data-table.tsx"), "utf8");
    const skeleton = readFileSync(path.join(process.cwd(), "src/components/ui/skeleton.tsx"), "utf8");
    const button = readFileSync(path.join(process.cwd(), "src/components/ui/button.tsx"), "utf8");
    const iconButton = readFileSync(path.join(process.cwd(), "src/components/ui/icon-button.tsx"), "utf8");
    const css = readFileSync(path.join(process.cwd(), "src/styles/components.css"), "utf8");
    const queryPush = readFileSync(path.join(process.cwd(), "src/hooks/use-query-push.ts"), "utf8");

    expect(table).toMatch(/if \(error\)/);
    expect(table).toMatch(/if \(loading\)/);
    expect(table).toMatch(/TableSkeleton/);
    expect(table).toMatch(/EmptyState/);
    expect(table).toMatch(/columns=\{columns\}/);
    expect(button).toMatch(/loading \? <SpinnerIcon/);
    expect(button).toMatch(/aria-busy=\{loading/);
    expect(button).toMatch(/disabled=\{Boolean\(disabled \|\| loading\)\}/);
    expect(iconButton).toMatch(/loading \? <SpinnerIcon/);
    expect(skeleton).toMatch(/export function TableSkeleton/);
    expect(skeleton).toMatch(/export function KpiGridSkeleton/);
    expect(skeleton).toMatch(/export function ListPageSkeleton/);
    expect(skeleton).toMatch(/export function ReportPageSkeleton/);
    expect(skeleton).toMatch(/export function DashboardPageSkeleton/);
    expect(queryPush).toMatch(/startTransition/);
    expect(css).toMatch(/@keyframes ui-skeleton-pulse/);
    expect(css).toMatch(/@keyframes ui-spin/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/loading.tsx"), "utf8")).toMatch(
      /ListPageSkeleton/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/dashboard/loading.tsx"), "utf8")).toMatch(
      /DashboardPageSkeleton/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(dashboard)/reports/loading.tsx"), "utf8")).toMatch(
      /ReportPageSkeleton/,
    );
    expect(readFileSync(path.join(process.cwd(), "src/app/(auth)/auth/login/loading.tsx"), "utf8")).toMatch(
      /AuthPageSkeleton/,
    );
  });
});

describe("detail chrome", () => {
  it("uses a power icon for active state and a back arrow in the topbar", () => {
    const icons = readFileSync(path.join(process.cwd(), "src/components/ui/icons.tsx"), "utf8");
    const topbar = readFileSync(path.join(process.cwd(), "src/components/layout/topbar.tsx"), "utf8");
    const chrome = readFileSync(path.join(process.cwd(), "src/components/layout/page-chrome.tsx"), "utf8");
    const css = readFileSync(path.join(process.cwd(), "src/styles/components.css"), "utf8");

    expect(icons).toMatch(/export function PowerIcon/);
    expect(icons).toMatch(/export function ArrowLeftIcon/);
    expect(topbar).toMatch(/ArrowLeftIcon/);
    expect(topbar).toMatch(/app-topbar-status/);
    expect(topbar).toMatch(/app-topbar-description/);
    expect(chrome).toMatch(/export function TopbarStatus/);
    expect(css).toMatch(/\.ui-icon-button-activate\s*\{[\s\S]*?color:\s*var\(--color-success\)/);
    expect(css).toMatch(/\.ui-icon-button-deactivate\s*\{[\s\S]*?color:\s*var\(--color-danger\)/);
  });
});
