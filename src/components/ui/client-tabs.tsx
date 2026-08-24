"use client";

type TabItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
};

type ClientTabsProps<T extends string = string> = {
  items: readonly TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
};

export function ClientTabs<T extends string>({ items, activeId, onChange, ariaLabel = "Section" }: ClientTabsProps<T>) {
  return (
    <nav className="ui-tabs" aria-label={ariaLabel} role="tablist">
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
            {item.icon && <span className="ui-tab-icon" aria-hidden="true">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}