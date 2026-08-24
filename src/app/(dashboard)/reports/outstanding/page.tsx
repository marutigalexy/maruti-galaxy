import { OutstandingReportView } from "@/components/reports/outstanding-report-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { getPartyOutstandingReport } from "@/services/reports/reports-service";
import { outstandingPartiesSchema, type OutstandingPartiesInput } from "@/lib/validation/reports";
import type { PartyOutstandingRow } from "@/services/reports/reports-service";

type OutstandingReportPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function OutstandingReportPage({ searchParams }: OutstandingReportPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: OutstandingPartiesInput;
  let result: Paginated<PartyOutstandingRow>;
  try {
    query = parseOrThrow(outstandingPartiesSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await getPartyOutstandingReport(query);
  } catch {
    return (
      <ErrorState
        title="Unable to load outstanding report"
        description="Something went wrong. Try again."
      />
    );
  }

  return <OutstandingReportView query={query} result={result} />;
}