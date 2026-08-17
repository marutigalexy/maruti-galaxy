import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { getDashboard, type DashboardSnapshot } from "@/services/dashboard/dashboard-service";

export default async function DashboardPage() {
  await requireActiveAdmin();

  let snapshot: DashboardSnapshot;
  try {
    snapshot = await getDashboard();
  } catch {
    return (
      <ErrorState title="Unable to load dashboard" description="Something went wrong. Try again." />
    );
  }

  return <DashboardView snapshot={snapshot} />;
}
