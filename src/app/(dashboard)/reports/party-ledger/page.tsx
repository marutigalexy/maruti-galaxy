import { PartyLedgerView } from "@/components/reports/party-ledger-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { partyLedgerSchema, type PartyLedgerInput } from "@/lib/validation/reports";
import { listPartyOptions } from "@/services/parties/parties-service";
import { getPartyLedger, type PartyLedgerRow } from "@/services/reports/reports-service";

type PartyLedgerPageProps = {
  searchParams: Promise<{
    party_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function PartyLedgerPage({ searchParams }: PartyLedgerPageProps) {
  await requireActiveAdmin();
  const params = await searchParams;

  let query: PartyLedgerInput;
  let result: Paginated<PartyLedgerRow>;
  let parties;
  try {
    query = parseOrThrow(partyLedgerSchema, {
      party_id: params.party_id,
      date_from: params.date_from,
      date_to: params.date_to,
      page: params.page,
      pageSize: params.pageSize,
    });
    [result, parties] = await Promise.all([getPartyLedger(query), listPartyOptions()]);
  } catch {
    return (
      <ErrorState title="Unable to load party ledger" description="Something went wrong. Try again." />
    );
  }

  return <PartyLedgerView query={query} result={result} parties={parties} />;
}
