import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { listAccountOptions } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { getEmployee, getEmployeeSummary } from "@/services/employees/employees-service";

type EmployeeDetailPageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  await requireActiveAdmin();
  const { employeeId } = await params;

  let employee;
  let summary;
  let accounts;
  let categories;
  try {
    parseOrThrow(uuidSchema, employeeId);
    [employee, summary, accounts, categories] = await Promise.all([
      getEmployee(employeeId),
      getEmployeeSummary(employeeId),
      listAccountOptions(),
      listCategoryOptions(),
    ]);
  } catch {
    return (
      <ErrorState
        title="Unable to load employee"
        description="This employee was not found or could not be loaded."
      />
    );
  }

  return (
    <EmployeeDetailView
      employee={employee}
      summary={summary}
      accounts={accounts}
      categories={categories}
    />
  );
}
