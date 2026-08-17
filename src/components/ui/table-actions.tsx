import type { MouseEvent, ReactNode } from "react";

type TableActionsProps = {
  children: ReactNode;
};

function stopRowClick(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}

export function TableActions({ children }: TableActionsProps) {
  return (
    <div className="ui-table-actions" onClick={stopRowClick}>
      {children}
    </div>
  );
}
