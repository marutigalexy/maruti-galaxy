export function queryHref(
  pathname: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") {
      continue;
    }
    if (key === "page" && Number(value) === 1) {
      continue;
    }
    if (key === "pageSize") {
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
