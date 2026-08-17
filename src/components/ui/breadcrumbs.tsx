import Link from "next/link";

import type { BreadcrumbItem } from "@/lib/navigation/nav";

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ui-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`}>
            {index > 0 ? " / " : null}
            {item.href && !last ? <Link href={item.href}>{item.label}</Link> : item.label}
          </span>
        );
      })}
    </nav>
  );
}
