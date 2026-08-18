import { PartyDetailView } from "@/components/parties/party-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { listAccountOptions } from "@/services/accounts/accounts-service";
import { listCategoryOptions } from "@/services/categories/categories-service";
import { getParty, getPartySummary } from "@/services/parties/parties-service";

type PartyDetailPageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function PartyDetailPage({ params }: PartyDetailPageProps) {
  await requireActiveAdmin();
  const { partyId } = await params;

  let party;
  let summary;
  let accounts;
  let categories;
  try {
    parseOrThrow(uuidSchema, partyId);
    [party, summary, accounts, categories] = await Promise.all([
      getParty(partyId),
      getPartySummary(partyId),
      listAccountOptions(),
      listCategoryOptions(),
    ]);
  } catch {
    return (
      <ErrorState
        title="Unable to load party"
        description="This party was not found or could not be loaded."
      />
    );
  }

  return <PartyDetailView party={party} summary={summary} accounts={accounts} categories={categories} />;
}
