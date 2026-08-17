export type NavChild = {
  href: string;
  label: string;
};

export type NavItem = {
  href: string;
  label: string;
  children?: readonly NavChild[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/parties", label: "Parties" },
  { href: "/employees", label: "Employees" },
  { href: "/invoices", label: "Invoices" },
  {
    href: "/accounting",
    label: "Accounting",
    children: [
      { href: "/accounting/entries", label: "Entries" },
      { href: "/accounting/accounts", label: "Accounts" },
      { href: "/accounting/categories", label: "Categories" },
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    children: [
      { href: "/reports/jobs", label: "Job Work Reports" },
      { href: "/reports/entries", label: "Payment / Entry Reports" },
      { href: "/reports/outstanding", label: "Outstanding Reports" },
      { href: "/reports/salary", label: "Salary Reports" },
      { href: "/reports/profit-loss", label: "Profit & Loss" },
    ],
  },
  { href: "/users", label: "Users" },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleForPath(pathname: string): string {
  for (const item of NAV_ITEMS) {
    if (item.children) {
      const child = item.children.find((entry) => isNavActive(pathname, entry.href));
      if (child) {
        return child.label;
      }
    }

    if (isNavActive(pathname, item.href)) {
      return item.label;
    }
  }

  return "Maruti Galaxy";
}

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return [];
  }

  const crumbs: BreadcrumbItem[] = [];
  let href = "";
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  for (const segment of segments) {
    href += `/${segment}`;
    const title = pageTitleForPath(href);
    crumbs.push({
      href,
      label: uuidRe.test(segment)
        ? "Detail"
        : segment === "new"
          ? "New"
          : segment === "edit"
            ? "Edit"
            : segment === "print"
            ? "Print"
            : title === "Maruti Galaxy"
              ? segment
              : title,
    });
  }

  const last = crumbs[crumbs.length - 1];
  if (last) {
    last.href = undefined;
  }

  return crumbs;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecordPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return false;
  }

  const last = segments[segments.length - 1] ?? "";
  return last === "new" || last === "edit" || last === "print" || UUID_RE.test(last);
}

export function parentPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "/dashboard";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}
