"use client";

import type { ReactNode } from "react";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  count?: number;
  badge?: ReactNode;
  icon?: ReactNode;
};

type ClientTabsProps<T extends string = string> = {
  items: readonly TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
};

export function ClientTabs<T extends string>({
  items,
  activeId,
  onChange,
  ariaLabel = "Sections",
  className = "",
}: ClientTabsProps<T>) {
  return (
    <nav
      className={`ui-tabs ${className}`.trim()}
      aria-label={ariaLabel}
      role="tablist"
    >
      {items.map((item) => {
        const current = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={current}
            aria-controls={`${item.id}-panel`}
            id={`${item.id}-tab`}
            className={`ui-tab ${current ? "is-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon && (
              <span className="ui-tab-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="ui-tab-label">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`ui-tab-badge ${current ? "is-active" : ""}`}
                aria-label={`${item.count} items`}
              >
                {item.count}
              </span>
            )}
            {item.badge && (
              <span className={`ui-tab-badge ${current ? "is-active" : ""}`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}