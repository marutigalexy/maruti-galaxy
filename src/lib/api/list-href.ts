import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";

type ListHrefQuery = {
  search: string;
  status: string;
  page: number;
  pageSize: number;
};

export function listHref(pathname: string, query: ListHrefQuery): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
