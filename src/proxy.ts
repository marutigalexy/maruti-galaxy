import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";
import { isPublicAuthPath, loginRedirectPath, DASHBOARD_PATH } from "@/lib/auth/paths";
import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import { getPublicSupabaseEnv } from "@/lib/env/public";
import { applySecurityHeaders } from "@/lib/security/headers";
import {
  RATE_LIMIT_MESSAGE,
  clientIpFromHeaders,
  consumeExportRateLimit,
  consumeLoginRateLimit,
} from "@/lib/security/rate-limit";

const cookieOptions = sessionCookieOptions();

function securityContext() {
  return {
    production: process.env.NODE_ENV === "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

function withSecurity(response: NextResponse, requestId: string): NextResponse {
  applySecurityHeaders(response.headers, securityContext());
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

function rateLimited(requestId: string, retryAfterSec: number): NextResponse {
  const response = NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
  return withSecurity(response, requestId);
}

function isLoginPost(request: NextRequest): boolean {
  if (request.method !== "POST") {
    return false;
  }
  const { pathname } = request.nextUrl;
  return pathname === "/auth/login" || pathname === "/login";
}

function isExportRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/api/export/");
}

export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const ip = clientIpFromHeaders(request.headers);

  if (isLoginPost(request)) {
    const loginLimit = consumeLoginRateLimit(ip);
    if (!loginLimit.allowed) {
      return rateLimited(requestId, loginLimit.retryAfterSec);
    }
  }

  if (isExportRequest(request)) {
    const exportLimit = consumeExportRateLimit(ip);
    if (!exportLimit.allowed) {
      return rateLimited(requestId, exportLimit.retryAfterSec);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  let response = withSecurity(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    requestId,
  );

  const { url, anonKey } = getPublicSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = withSecurity(
          NextResponse.next({
            request: { headers: requestHeaders },
          }),
          requestId,
        );
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = isPublicAuthPath(pathname);

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    const target = loginRedirectPath(pathname);
    const [path, query] = target.split("?");
    redirectUrl.pathname = path ?? "/auth/login";
    redirectUrl.search = query ? `?${query}` : "";
    return withSecurity(NextResponse.redirect(redirectUrl), requestId);
  }

  if (user && isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DASHBOARD_PATH;
    redirectUrl.search = "";
    return withSecurity(NextResponse.redirect(redirectUrl), requestId);
  }

  if (user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DASHBOARD_PATH;
    redirectUrl.search = "";
    return withSecurity(NextResponse.redirect(redirectUrl), requestId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
