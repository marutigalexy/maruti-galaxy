import { JobDetailView } from "@/components/jobs/job-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { listAccountOptions } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { listEmployeeOptions } from "@/services/employees/employees-service";
import { getInvoice } from "@/services/invoices/invoices-service";
import { getJob } from "@/services/jobs/jobs-service";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  await requireActiveAdmin();
  const { jobId } = await params;

  let job;
  let invoice = null;
  let employees;
  let accounts;
  let categories;
  try {
    parseOrThrow(uuidSchema, jobId);
    [job, employees, accounts, categories] = await Promise.all([
      getJob(jobId),
      listEmployeeOptions(),
      listAccountOptions(),
      listCategoryOptions(),
    ]);
    if (job.invoice) {
      invoice = await getInvoice(job.invoice.id);
    }
  } catch {
    return (
      <ErrorState
        title="Unable to load job"
        description="This job was not found or could not be loaded."
      />
    );
  }

  return (
    <JobDetailView
      job={job}
      invoice={invoice}
      employees={employees}
      accounts={accounts}
      categories={categories}
    />
  );
}
