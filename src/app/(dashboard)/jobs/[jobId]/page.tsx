import { JobDetailView } from "@/components/jobs/job-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { listEmployeeOptions } from "@/services/employees/employees-service";
import { getJob } from "@/services/jobs/jobs-service";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  await requireActiveAdmin();
  const { jobId } = await params;

  let job;
  let employees;
  try {
    parseOrThrow(uuidSchema, jobId);
    [job, employees] = await Promise.all([getJob(jobId), listEmployeeOptions()]);
  } catch {
    return (
      <ErrorState
        title="Unable to load job"
        description="This job was not found or could not be loaded."
      />
    );
  }

  return <JobDetailView job={job} employees={employees} />;
}
