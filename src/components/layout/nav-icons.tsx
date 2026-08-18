import type { ReactNode } from "react";

type IconSize = "nav" | "sm";

type IconProps = {
  title: string;
  children: ReactNode;
  size?: IconSize;
};

function Icon({ title, children, size = "nav" }: IconProps) {
  const px = size === "sm" ? 16 : 20;
  return (
    <svg
      className={size === "sm" ? "ui-icon" : "app-nav-icon"}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function DashboardIcon() {
  return (
    <Icon title="Dashboard">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icon>
  );
}

export function JobsIcon() {
  return (
    <Icon title="Jobs">
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
      <path d="M2 13h20" />
    </Icon>
  );
}

export function PartiesIcon() {
  return (
    <Icon title="Parties">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12h4" />
      <path d="M14 12h4" />
      <path d="M6 16h4" />
      <path d="M14 16h4" />
      <path d="M10 22v-4h4v4" />
    </Icon>
  );
}

export function EmployeesIcon() {
  return (
    <Icon title="Employees">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function AccountingIcon() {
  return (
    <Icon title="Accounting">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h.01" />
      <path d="M10 15h2" />
    </Icon>
  );
}

export function ReportsIcon() {
  return (
    <Icon title="Reports">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V8" />
      <path d="M17 16v-9" />
    </Icon>
  );
}

export function UsersIcon() {
  return (
    <Icon title="Users">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  );
}

export function MenuIcon() {
  return (
    <Icon title="Menu" size="sm">
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </Icon>
  );
}

export function CollapseIcon() {
  return (
    <Icon title="Collapse" size="sm">
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function ExpandIcon() {
  return (
    <Icon title="Expand" size="sm">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon title="Close" size="sm">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

export function iconForHref(href: string) {
  if (href.startsWith("/jobs")) return <JobsIcon />;
  if (href.startsWith("/parties")) return <PartiesIcon />;
  if (href.startsWith("/employees")) return <EmployeesIcon />;
  if (href.startsWith("/accounting")) return <AccountingIcon />;
  if (href.startsWith("/reports")) return <ReportsIcon />;
  if (href.startsWith("/users")) return <UsersIcon />;
  return <DashboardIcon />;
}
