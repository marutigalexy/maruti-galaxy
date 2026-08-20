import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SortIcon } from "@/components/ui/icons";
import { TableSkeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  numeric?: boolean;
  align?: "center";
  sortKey?: string;
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
  getRowProps?: (row: T) => HTMLAttributes<HTMLTableRowElement> | undefined;
  footer?: ReactNode;
  sort?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
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
  getRowProps,
  footer,
  sort,
  sortDir = "desc",
  onSort,
}: DataTableProps<T>) {
  function columnClass(column: DataTableColumn<T>, isHeader = false) {
    const classes: string[] = [];
    if (column.numeric) {
      classes.push("is-numeric");
    }
    if (column.align === "center" || column.key === "status" || column.key === "type" || column.key === "expand") {
      classes.push("is-center");
    }
    if (column.key === "expand") {
      classes.push("is-expand");
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
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && target.closest("button, a, input, select, textarea")) {
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
              <th
                key={column.key}
                scope="col"
                className={[columnClass(column, true), column.sortKey && onSort ? "is-sortable" : ""]
                  .filter(Boolean)
                  .join(" ") || undefined}
                aria-sort={
                  column.sortKey && sort === column.sortKey
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.sortKey && onSort ? (
                  <button
                    type="button"
                    className="ui-table-sort"
                    onClick={() => onSort(column.sortKey as string)}
                  >
                    {column.header}
                    <SortIcon
                      className={[
                        "ui-table-sort-icon",
                        sort === column.sortKey ? (sortDir === "asc" ? "is-asc" : "is-desc") : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      width={14}
                      height={14}
                    />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const extra = getRowProps?.(row);
            const className = [onRowClick ? "is-clickable" : undefined, extra?.className]
              .filter(Boolean)
              .join(" ") || undefined;
            return (
              <tr
                key={rowKey(row)}
                {...extra}
                className={className}
                tabIndex={onRowClick ? 0 : extra?.tabIndex}
                onClick={onRowClick ? () => onRowClick(row) : extra?.onClick}
                onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : extra?.onKeyDown}
              >
                {columns.map((column) => (
                  <td key={column.key} className={columnClass(column)}>
                    {column.render ? column.render(row) : null}
                  </td>
                ))}
              </tr>
            );
          })}
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
