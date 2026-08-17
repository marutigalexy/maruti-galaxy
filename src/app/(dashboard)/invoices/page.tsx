import { InvoicesView } from "@/components/invoices/invoices-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listInvoicesSchema, type ListInvoicesInput } from "@/lib/validation/invoices";
import { listInvoices, type InvoiceListRecord } from "@/services/invoices/invoices-service";
import { listPartyOptions, type PartyOption } from "@/services/parties/parties-service";

type InvoicesPageProps = {
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

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListInvoicesInput;
  let result: Paginated<InvoiceListRecord>;
  let parties: PartyOption[];
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
    [result, parties] = await Promise.all([listInvoices(query), listPartyOptions()]);
  } catch {
    return (
      <ErrorState title="Unable to load invoices" description="Something went wrong. Try again." />
    );
  }

  return <InvoicesView query={query} result={result} parties={parties} />;
}
