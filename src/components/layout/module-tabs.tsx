"use client";

import { usePathname } from "next/navigation";

import { Tabs } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation/nav";

type ModuleTabsProps = {
  moduleHref: string;
};

export function ModuleTabs({ moduleHref }: ModuleTabsProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.find((item) => item.href === moduleHref)?.children ?? [];
  const activeHref =
    items.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ??
    pathname;

  if (items.length === 0) {
    return null;
  }

  return <Tabs items={items} activeHref={activeHref} />;
}
