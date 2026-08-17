import { PartiesView } from "@/components/parties/parties-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listPartiesSchema, type ListPartiesInput } from "@/lib/validation/parties";
import { listParties, type PartyRecord } from "@/services/parties/parties-service";

type PartiesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function PartiesPage({ searchParams }: PartiesPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListPartiesInput;
  let result: Paginated<PartyRecord>;
  try {
    query = parseOrThrow(listPartiesSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await listParties(query);
  } catch {
    return (
      <ErrorState title="Unable to load parties" description="Something went wrong. Try again." />
    );
  }

  return <PartiesView query={query} result={result} />;
}
