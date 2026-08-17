import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { getEmployee, getEmployeeSummary } from "@/services/employees/employees-service";

type EmployeeDetailPageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  await requireActiveAdmin();
  const { employeeId } = await params;

  let employee;
  let summary;
  try {
    parseOrThrow(uuidSchema, employeeId);
    [employee, summary] = await Promise.all([
      getEmployee(employeeId),
      getEmployeeSummary(employeeId),
    ]);
  } catch {
    return (
      <ErrorState
        title="Unable to load employee"
        description="This employee was not found or could not be loaded."
      />
    );
  }

  return <EmployeeDetailView employee={employee} summary={summary} />;
}
