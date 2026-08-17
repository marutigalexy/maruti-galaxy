"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastProvider } from "@/components/ui/toast";
import { isRecordPath, pageTitleForPath, parentPath } from "@/lib/navigation/nav";

const STORAGE_KEY = "maruti-galaxy.sidebar-collapsed";
const SIDEBAR_EVENT = "maruti-galaxy-sidebar";

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function collapsedSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

type AppShellProps = {
  name: string;
  email: string;
  role: string;
  children: ReactNode;
};

export function AppShell({ name, email, role, children }: AppShellProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, collapsedSnapshot, () => false);
  const [mobilePath, setMobilePath] = useState(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (mobilePath !== pathname) {
    setMobilePath(pathname);
    setMobileOpen(false);
  }

  const title = pageTitleForPath(pathname);
  const recordPage = isRecordPath(pathname);

  return (
    <ToastProvider>
      <div className="app-shell">
        {mobileOpen ? (
          <button
            type="button"
            className="app-nav-scrim"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          name={name}
          email={email}
          role={role}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapse={() => {
            window.localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
            window.dispatchEvent(new Event(SIDEBAR_EVENT));
          }}
        />
        <div className="app-shell-main">
          <Topbar
            title={title}
            titleIsHeading={!recordPage}
            backHref={recordPage ? parentPath(pathname) : undefined}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
