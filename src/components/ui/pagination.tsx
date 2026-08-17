import { ALLOWED_PAGE_SIZES, paginationControls } from "@/lib/api/pagination";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const controls = paginationControls(page, pageSize, totalCount);

  return (
    <div className="ui-pagination">
      <div className="ui-pagination-left">
        <p className="ui-pagination-meta">
          {totalCount === 0
            ? "No records"
            : `Showing ${controls.start}–${controls.end} of ${totalCount}`}
        </p>
      </div>
      <div className="ui-pagination-controls">
        <label htmlFor="page-size" className="ui-pagination-rows-label">
          <span>Rows</span>
          <Select
            id="page-size"
            value={String(controls.pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="ui-pagination-select"
          >
            {ALLOWED_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
        
        <div className="ui-pagination-nav">
          <Button
            variant="secondary"
            className="ui-pagination-btn"
            disabled={controls.prevDisabled}
            onClick={() => onPageChange(controls.page - 1)}
            aria-label="Previous page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Button>
          
          <span className="ui-pagination-page-info">
            {controls.page} / {controls.totalPages || 1}
          </span>
          
          <Button
            variant="secondary"
            className="ui-pagination-btn"
            disabled={controls.nextDisabled}
            onClick={() => onPageChange(controls.page + 1)}
            aria-label="Next page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
