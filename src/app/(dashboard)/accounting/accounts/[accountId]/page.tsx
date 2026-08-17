import { AccountDetailView } from "@/components/accounts/account-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { listEntriesSchema, type ListEntriesInput } from "@/lib/validation/entries";
import { getAccount } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { listEntries } from "@/services/entries/entries-service";

type AccountDetailPageProps = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{
    entry_type?: string;
    category_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
  await requireActiveAdmin();
  const { accountId } = await params;
  const filters = await searchParams;

  let account;
  let query: ListEntriesInput;
  let entries;
  let categories;
  try {
    parseOrThrow(uuidSchema, accountId);
    query = parseOrThrow(listEntriesSchema, {
      search: "",
      entry_type: filters.entry_type ?? "all",
      account_id: accountId,
      category_id: filters.category_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      page: filters.page,
      pageSize: filters.pageSize,
    });
    [account, entries, categories] = await Promise.all([
      getAccount(accountId),
      listEntries(query),
      listCategoryOptions(),
    ]);
  } catch {
    return (
      <ErrorState
        title="Unable to load account"
        description="This account was not found or could not be loaded."
      />
    );
  }

  return (
    <AccountDetailView account={account} query={query} entries={entries} categories={categories} />
  );
}
