import { EmployeesView } from "@/components/employees/employees-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listEmployeesSchema, type ListEmployeesInput } from "@/lib/validation/employees";
import { listEmployees, type EmployeeRecord } from "@/services/employees/employees-service";

type EmployeesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListEmployeesInput;
  let result: Paginated<EmployeeRecord>;
  try {
    query = parseOrThrow(listEmployeesSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await listEmployees(query);
  } catch {
    return (
      <ErrorState title="Unable to load employees" description="Something went wrong. Try again." />
    );
  }

  return <EmployeesView query={query} result={result} />;
}
