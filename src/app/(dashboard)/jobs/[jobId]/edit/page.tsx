import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";

type JobEditPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobEditPage({ params }: JobEditPageProps) {
  await requireActiveAdmin();
  const { jobId } = await params;

  try {
    parseOrThrow(uuidSchema, jobId);
  } catch {
    return (
      <ErrorState
        title="Unable to load job"
        description="This job was not found or could not be loaded."
      />
    );
  }

  redirect(`/jobs/${jobId}`);
}
