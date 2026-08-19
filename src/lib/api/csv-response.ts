import { NextResponse } from "next/server";

import { isAppError } from "@/lib/api/result";

export function csvAttachment(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function exportErrorResponse(error: unknown, fallback: string): NextResponse {
  if (isAppError(error) && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")) {
    return NextResponse.json({ error: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
  }
  if (isAppError(error) && error.code === "VALIDATION") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (isAppError(error) && error.code === "NOT_FOUND") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (isAppError(error) && error.code === "RATE_LIMIT") {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function searchParamRecord(url: URL): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
