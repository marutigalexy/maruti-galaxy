import { AccountsView } from "@/components/accounts/accounts-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listAccountsSchema, type ListAccountsInput } from "@/lib/validation/accounts";
import { listAccounts, type AccountRecord } from "@/services/accounts/accounts-service";

type AccountsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListAccountsInput;
  let result: Paginated<AccountRecord>;
  try {
    query = parseOrThrow(listAccountsSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await listAccounts(query);
  } catch {
    return (
      <ErrorState title="Unable to load accounts" description="Something went wrong. Try again." />
    );
  }

  return <AccountsView query={query} result={result} />;
}
