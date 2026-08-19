import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ResetIcon } from "@/components/ui/icons";

type FilterBarProps = {
  children: ReactNode;
  onReset?: () => void;
  action?: ReactNode;
};

export function FilterBar({ children, onReset, action }: FilterBarProps) {
  return (
    <div className="ui-list-toolbar">
      <div className="ui-filter-bar" role="search" aria-label="Filters">
        {children}
        {onReset ? (
          <Button variant="secondary" className="ui-reset-button" onClick={onReset}>
            <ResetIcon width={16} height={16} aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>
      {action ? <div className="ui-list-toolbar-action">{action}</div> : null}
    </div>
  );
}
