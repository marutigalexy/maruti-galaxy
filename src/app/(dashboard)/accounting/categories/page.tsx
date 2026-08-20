import { CategoriesView } from "@/components/categories/categories-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listCategoriesSchema, type ListCategoriesInput } from "@/lib/validation/categories";
import { listCategories, type CategoryRecord } from "@/services/categories/categories-service";

type CategoriesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListCategoriesInput;
  let result: Paginated<CategoryRecord>;
  try {
    query = parseOrThrow(listCategoriesSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      type: params.type ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await listCategories(query);
  } catch {
    return (
      <ErrorState
        title="Unable to load categories"
        description="Something went wrong. Try again."
      />
    );
  }

  return <CategoriesView query={query} result={result} />;
}
