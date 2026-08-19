import { JobWorkReportView } from "@/components/reports/job-work-report-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { jobWorkReportSchema, type JobWorkReportInput } from "@/lib/validation/reports";
import { listPartyOptions } from "@/services/parties/parties-service";
import { getJobWorkReport, type JobWorkReportRow } from "@/services/reports/reports-service";

type JobWorkReportsPageProps = {
  searchParams: Promise<{
    status?: string;
    job_type?: string;
    party_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function JobWorkReportsPage({ searchParams }: JobWorkReportsPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: JobWorkReportInput;
  let result: Paginated<JobWorkReportRow>;
  let parties;
  try {
    query = parseOrThrow(jobWorkReportSchema, {
      status: params.status ?? "all",
      job_type: params.job_type ?? "all",
      party_id: params.party_id,
      search: params.search ?? "",
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, parties] = await Promise.all([getJobWorkReport(query), listPartyOptions()]);
  } catch {
    return (
      <ErrorState title="Unable to load job work report" description="Something went wrong. Try again." />
    );
  }

  return <JobWorkReportView query={query} result={result} parties={parties} />;
}
