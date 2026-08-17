export const LOGIN_PATH = "/auth/login";
export const LOGIN_ALIAS_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";

export function isPublicAuthPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === LOGIN_ALIAS_PATH;
}

export function loginRedirectPath(currentPath: string): string {
  if (isPublicAuthPath(currentPath) || currentPath === "/") {
    return LOGIN_PATH;
  }

  const url = new URL(LOGIN_PATH, "http://localhost");
  url.searchParams.set("next", currentPath);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function postLoginPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || isPublicAuthPath(next)) {
    return DASHBOARD_PATH;
  }

  return next;
}
