import { EntryReportView } from "@/components/reports/entry-report-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listEntriesSchema, type ListEntriesInput } from "@/lib/validation/entries";
import { listAccountOptions } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { listEmployeeOptions } from "@/services/employees/employees-service";
import { listPartyOptions } from "@/services/parties/parties-service";
import { getEntryLedger } from "@/services/reports/reports-service";
import type { ListedEntries } from "@/services/entries/entries-service";

type EntryLedgerPageProps = {
  searchParams: Promise<{
    search?: string;
    entry_type?: string;
    account_id?: string;
    category_id?: string;
    party_id?: string;
    employee_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function EntryLedgerPage({ searchParams }: EntryLedgerPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListEntriesInput;
  let result: ListedEntries;
  let accounts;
  let categories;
  let parties;
  let employees;
  try {
    query = parseOrThrow(listEntriesSchema, {
      search: params.search ?? "",
      entry_type: params.entry_type ?? "all",
      account_id: params.account_id,
      category_id: params.category_id,
      party_id: params.party_id,
      employee_id: params.employee_id,
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, accounts, categories, parties, employees] = await Promise.all([
      getEntryLedger(query),
      listAccountOptions(),
      listCategoryOptions(),
      listPartyOptions(),
      listEmployeeOptions(),
    ]);
  } catch {
    return (
      <ErrorState title="Unable to load entry ledger" description="Something went wrong. Try again." />
    );
  }

  return (
    <EntryReportView
      variant="ledger"
      query={query}
      result={result}
      accounts={accounts}
      categories={categories}
      parties={parties}
      employees={employees}
    />
  );
}
