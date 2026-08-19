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
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
