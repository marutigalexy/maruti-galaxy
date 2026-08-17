import { SalaryReportView } from "@/components/reports/salary-report-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { salaryReportSchema, type SalaryReportInput } from "@/lib/validation/reports";
import { listEmployeeOptions } from "@/services/employees/employees-service";
import { getSalaryReport, type SalaryReportRow } from "@/services/reports/reports-service";

type SalaryReportPageProps = {
  searchParams: Promise<{
    employee_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function SalaryReportPage({ searchParams }: SalaryReportPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: SalaryReportInput;
  let result: Paginated<SalaryReportRow>;
  let employees;
  try {
    query = parseOrThrow(salaryReportSchema, {
      employee_id: params.employee_id,
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, employees] = await Promise.all([getSalaryReport(query), listEmployeeOptions()]);
  } catch {
    return (
      <ErrorState title="Unable to load salary report" description="Something went wrong. Try again." />
    );
  }

  return <SalaryReportView query={query} result={result} employees={employees} />;
}
