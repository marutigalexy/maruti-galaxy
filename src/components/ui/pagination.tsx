import { paginationControls } from "@/lib/api/pagination";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  disabled = false,
  onPageChange,
}: PaginationProps) {
  const controls = paginationControls(page, pageSize, totalCount);

  return (
    <div className="ui-pagination">
      <p className="ui-pagination-meta">
        {totalCount === 0
          ? "No records"
          : `Showing ${controls.start}–${controls.end} of ${totalCount}`}
      </p>
      <div className="ui-pagination-nav" aria-label="Pagination">
        <Button
          variant="secondary"
          className="ui-pagination-btn"
          disabled={disabled || controls.prevDisabled}
          onClick={() => onPageChange(controls.page - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>

        <span className="ui-pagination-page-info">
          {controls.page} / {controls.totalPages || 1}
        </span>

        <Button
          variant="secondary"
          className="ui-pagination-btn"
          disabled={disabled || controls.nextDisabled}
          onClick={() => onPageChange(controls.page + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
