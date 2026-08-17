"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "@/components/brand/logo";
import { CloseIcon, CollapseIcon, ExpandIcon, iconForHref } from "@/components/layout/nav-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronDownIcon, LogOutIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { logoutAction } from "@/app/actions/auth";
import { isNavActive, NAV_ITEMS, type NavItem } from "@/lib/navigation/nav";

const NAV_SPLIT_BEFORE = new Set(["/invoices", "/reports", "/users"]);

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  name: string;
  email: string;
  role: string;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("") || "MG";
}

function NavEntry({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const current = isNavActive(pathname, item.href);

  return (
    <Tooltip
      label={item.label}
      enabled={collapsed}
      className={NAV_SPLIT_BEFORE.has(item.href) ? "app-nav-split" : undefined}
    >
      <Link
        href={item.href}
        className="app-nav-link"
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
      >
        {iconForHref(item.href)}
        <span className="app-nav-label">{item.label}</span>
      </Link>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  name,
  email,
  role,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const roleLabel = role === "admin" ? "Admin" : role;

  return (
    <aside
      className={["app-sidebar", collapsed ? "is-collapsed" : "", mobileOpen ? "is-open" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Primary"
    >
      <div className="app-sidebar-brand">
        <div className="app-sidebar-logo-plate">
          <BrandMark width={32} height={32} alt="" />
        </div>
        <span className="app-sidebar-brand-text">Maruti Galaxy</span>
        <Button
          variant="ghost"
          className="app-collapse-toggle"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </Button>
        <Button
          variant="ghost"
          className="app-sidebar-close"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        >
          <CloseIcon />
        </Button>
      </div>
      <nav className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavEntry
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>
      <div className="app-sidebar-footer">
        <button
          type="button"
          className="app-sidebar-profile"
          aria-expanded={profileOpen}
          aria-controls="sidebar-profile-menu"
          title={`${name} · ${email}`}
          onClick={() => setProfileOpen((open) => !open)}
        >
          <span className="app-avatar" aria-hidden="true">
            {initials(name)}
          </span>
          {!collapsed ? (
            <div className="app-profile-copy">
              <strong>{name}</strong>
              <span>{roleLabel}</span>
            </div>
          ) : null}
          {!collapsed ? (
            <ChevronDownIcon
              width={16}
              height={16}
              className={["app-profile-chevron", profileOpen ? "is-open" : ""].filter(Boolean).join(" ")}
              aria-hidden="true"
            />
          ) : null}
        </button>
        {profileOpen && !collapsed ? (
          <div id="sidebar-profile-menu" className="app-sidebar-profile-menu">
            <button type="button" className="app-sidebar-logout-item" onClick={() => setLogoutOpen(true)}>
              <LogOutIcon width={16} height={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        ) : null}
        {collapsed ? (
          <button
            type="button"
            className="app-sidebar-logout-collapsed"
            aria-label="Log out"
            onClick={() => setLogoutOpen(true)}
          >
            <span className="app-sidebar-logout-avatar" aria-hidden="true">
              <span className="app-avatar">{initials(name)}</span>
            </span>
            <span className="app-sidebar-logout-action">
              <LogOutIcon width={16} height={16} aria-hidden="true" />
              <span>Log out</span>
            </span>
          </button>
        ) : null}
      </div>
      <ConfirmDialog
        open={logoutOpen}
        title="Confirm Logout"
        description="Are you sure you want to logout?"
        confirmLabel="Log out"
        pending={pending}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setPending(true);
          void logoutAction();
        }}
      />
    </aside>
  );
}
