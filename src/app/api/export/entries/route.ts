import { NextResponse } from "next/server";

import { isAppError } from "@/lib/api/result";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listEntriesSchema } from "@/lib/validation/entries";
import { exportEntriesCsv } from "@/services/entries/entries-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireActiveAdmin();
    const url = new URL(request.url);
    const parsed = parseOrThrow(listEntriesSchema, {
      search: url.searchParams.get("search") ?? "",
      entry_type: url.searchParams.get("entry_type") ?? "all",
      account_id: url.searchParams.get("account_id") ?? undefined,
      category_id: url.searchParams.get("category_id") ?? undefined,
      party_id: url.searchParams.get("party_id") ?? undefined,
      employee_id: url.searchParams.get("employee_id") ?? undefined,
      date_from: url.searchParams.get("date_from") ?? undefined,
      date_to: url.searchParams.get("date_to") ?? undefined,
      page: "1",
      pageSize: "20",
    });
    const { csv } = await exportEntriesCsv(parsed);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="maruti-galaxy-entries.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error) && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")) {
      return NextResponse.json({ error: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (isAppError(error) && error.code === "VALIDATION") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isAppError(error) && error.code === "RATE_LIMIT") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: "Unable to export entries." }, { status: 500 });
  }
}
