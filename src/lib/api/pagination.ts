export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;

export type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export type Paginated<T> = {
  records: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function clampPageSize(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(value, MAX_PAGE_SIZE);
}

export function paginationOffset(page: number, pageSize: number): number {
  const safePage = page < 1 ? 1 : page;
  const safeSize = clampPageSize(pageSize);
  return (safePage - 1) * safeSize;
}

export function paginated<T>(
  records: T[],
  totalCount: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    records,
    page: page < 1 ? 1 : page,
    pageSize: clampPageSize(pageSize),
    totalCount,
  };
}

export function paginationControls(page: number, pageSize: number, totalCount: number) {
  const safeSize = clampPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(totalCount, 0) / safeSize));
  const safePage = page < 1 ? 1 : Math.min(page, totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * safeSize + 1;
  const end = Math.min(safePage * safeSize, totalCount);

  return {
    page: safePage,
    pageSize: safeSize,
    totalPages,
    start,
    end,
    prevDisabled: safePage <= 1,
    nextDisabled: safePage >= totalPages,
  };
}
