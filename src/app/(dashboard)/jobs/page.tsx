import { JobsView } from "@/components/jobs/jobs-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listJobsSchema, type ListJobsInput } from "@/lib/validation/jobs";
import { listEmployeeOptions, type EmployeeOption } from "@/services/employees/employees-service";
import { listJobs, type JobListRecord } from "@/services/jobs/jobs-service";
import { listPartyOptions, type PartyOption } from "@/services/parties/parties-service";

type JobsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    job_type?: string;
    party_id?: string;
    employee_id?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ListJobsInput;
  let result: Paginated<JobListRecord>;
  let parties: PartyOption[];
  let employees: EmployeeOption[];
  try {
    query = parseOrThrow(listJobsSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      job_type: params.job_type ?? "all",
      party_id: params.party_id,
      employee_id: params.employee_id,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, parties, employees] = await Promise.all([
      listJobs(query),
      listPartyOptions(),
      listEmployeeOptions(),
    ]);
  } catch {
    return <ErrorState title="Unable to load jobs" description="Something went wrong. Try again." />;
  }

  return <JobsView query={query} result={result} parties={parties} employees={employees} />;
}
