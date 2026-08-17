import { EntriesView } from "@/components/entries/entries-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listEntriesSchema, type ListEntriesInput } from "@/lib/validation/entries";
import { listAccountOptions } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { listEmployeeOptions } from "@/services/employees/employees-service";
import { listEntries, type ListedEntries } from "@/services/entries/entries-service";
import { listPartyOptions } from "@/services/parties/parties-service";

type EntriesPageProps = {
  searchParams: Promise<{
    search?: string;
    entry_type?: string;
    account_id?: string;
    category_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
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
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, accounts, categories, parties, employees] = await Promise.all([
      listEntries(query),
      listAccountOptions(),
      listCategoryOptions(),
      listPartyOptions(),
      listEmployeeOptions(),
    ]);
  } catch {
    return (
      <ErrorState title="Unable to load entries" description="Something went wrong. Try again." />
    );
  }

  return (
    <EntriesView
      query={query}
      result={result}
      accounts={accounts}
      categories={categories}
      parties={parties}
      employees={employees}
    />
  );
}
