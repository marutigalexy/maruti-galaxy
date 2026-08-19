import type { KeyboardEvent, ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  numeric?: boolean;
  align?: "center";
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
};

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  onRetry,
  onRowClick,
  footer,
}: DataTableProps<T>) {
  function columnClass(column: DataTableColumn<T>, isHeader = false) {
    const classes: string[] = [];
    if (column.numeric) {
      classes.push("is-numeric");
    }
    if (column.align === "center" || column.key === "status" || column.key === "type") {
      classes.push("is-center");
    }
    if (!isHeader && column.key === "price") {
      classes.push("ui-price");
    }
    return classes.length > 0 ? classes.join(" ") : undefined;
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  let body: ReactNode;
  if (error) {
    body = <ErrorState title="Unable to load records" description={error} onRetry={onRetry} />;
  } else if (loading) {
    body = (
      <TableSkeleton
        framed={false}
        caption={caption}
        columns={columns}
        rows={rows.length > 0 ? rows.length : 8}
      />
    );
  } else if (rows.length === 0) {
    body = <EmptyState title={emptyTitle} description={emptyDescription} />;
  } else {
    body = (
      <table className="ui-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={columnClass(column, true)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "is-clickable" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={columnClass(column)}>
                  {column.render ? column.render(row) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="ui-table-wrap" aria-busy={loading || undefined} aria-live={loading ? "polite" : undefined}>
      {loading ? <span className="sr-only">Loading</span> : null}
      {body}
      {footer}
    </div>
  );
}
