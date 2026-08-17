import { ProfitLossView } from "@/components/reports/profit-loss-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { profitLossSchema, type ProfitLossInput } from "@/lib/validation/reports";
import { getProfitLossReport, type ProfitLossReport } from "@/services/reports/reports-service";

type ProfitLossPageProps = {
  searchParams: Promise<{
    date_from?: string;
    date_to?: string;
  }>;
};

export default async function ProfitLossPage({ searchParams }: ProfitLossPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: ProfitLossInput;
  let result: ProfitLossReport;
  try {
    query = parseOrThrow(profitLossSchema, {
      date_from: params.date_from,
      date_to: params.date_to,
    });
    result = await getProfitLossReport(query);
  } catch {
    return (
      <ErrorState title="Unable to load profit and loss" description="Something went wrong. Try again." />
    );
  }

  return <ProfitLossView query={query} result={result} />;
}
