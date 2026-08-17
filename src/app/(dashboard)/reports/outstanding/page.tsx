import { OutstandingReportView } from "@/components/reports/outstanding-report-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listInvoicesSchema, type ListInvoicesInput } from "@/lib/validation/invoices";
import type { InvoiceListRecord } from "@/services/invoices/invoices-service";
import { listPartyOptions } from "@/services/parties/parties-service";
import { getOutstandingReport } from "@/services/reports/reports-service";

type OutstandingReportPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    party_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function OutstandingReportPage({ searchParams }: OutstandingReportPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListInvoicesInput;
  let result: Paginated<InvoiceListRecord>;
  let parties;
  try {
    query = parseOrThrow(listInvoicesSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      party_id: params.party_id,
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, parties] = await Promise.all([getOutstandingReport(query), listPartyOptions()]);
  } catch {
    return (
      <ErrorState
        title="Unable to load outstanding report"
        description="Something went wrong. Try again."
      />
    );
  }

  return <OutstandingReportView query={query} result={result} parties={parties} />;
}
