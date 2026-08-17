"use client";

import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { queryHref } from "@/lib/api/query-href";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { PartyLedgerInput } from "@/lib/validation/reports";
import type { PartyOption } from "@/services/parties/parties-service";
import type { PartyLedgerRow } from "@/services/reports/reports-service";

type PartyLedgerViewProps = {
  query: PartyLedgerInput;
  result: Paginated<PartyLedgerRow>;
  parties: PartyOption[];
};

export function PartyLedgerView({ query, result, parties }: PartyLedgerViewProps) {
  const router = useRouter();
  const pushQuery = (next: PartyLedgerInput) => {
    router.push(queryHref("/reports/party-ledger", next));
  };

  return (
    <>
      <FilterBar
        onReset={() =>
          pushQuery({
            party_id: undefined,
            date_from: undefined,
            date_to: undefined,
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <FormField label="Party" htmlFor="report-party-ledger" required>
          <Select
            id="report-party-ledger"
            value={query.party_id ?? ""}
            onChange={(event) => pushQuery({ ...query, party_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">Select party</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.company_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date From" htmlFor="report-party-from">
          <DatePicker
            id="report-party-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-party-to">
          <DatePicker
            id="report-party-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })}
          />
        </FormField>
      </FilterBar>
      <DataTable
        caption="Party ledger"
        columns={[
          { key: "date", header: "Date", render: (row) => formatDisplayDate(row.date) },
          { key: "kind", header: "Type", render: (row) => row.kind },
          { key: "reference", header: "Reference", render: (row) => row.reference },
          { key: "amount", header: "Amount", numeric: true, render: (row) => formatInr(row.amount) },
          { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "—" },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        emptyTitle={query.party_id ? "No ledger rows for this party." : "Select a party to view the ledger."}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        onPageChange={(page) => pushQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
      />
    </>
  );
}
