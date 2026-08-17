import Link from "next/link";

type TabItem = {
  href: string;
  label: string;
};

type TabsProps = {
  items: readonly TabItem[];
  activeHref: string;
};

export function Tabs({ items, activeHref }: TabsProps) {
  return (
    <nav className="ui-tabs" aria-label="Section">
      {items.map((item) => {
        const current = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="ui-tab"
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
