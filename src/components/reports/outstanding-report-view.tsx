"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useQueryPush } from "@/hooks/use-query-push";
import { queryHref } from "@/lib/api/query-href";
import type { Paginated } from "@/lib/api/pagination";
import { formatInr } from "@/lib/formatters";
import type { OutstandingPartiesInput } from "@/lib/validation/reports";
import type { PartyOutstandingRow } from "@/services/reports/reports-service";

function partyStatusTone(status: PartyOutstandingRow["status"]) {
  if (status === "Paid") return "paid" as const;
  if (status === "Partially Paid") return "partial" as const;
  return "unpaid" as const;
}

function amountClass(status: PartyOutstandingRow["status"]) {
  if (status === "Paid") return "ui-amount-paid";
  if (status === "Partially Paid") return "ui-amount-partial";
  if (status === "Unpaid") return "ui-amount-unpaid";
  return "";
}

function exportHref(query: OutstandingPartiesInput): string {
  return queryHref("/api/export/outstanding-parties", {
    search: query.search,
    status: query.status,
  });
}

export function OutstandingReportView({
  query,
  result,
}: {
  query: OutstandingPartiesInput;
  result: Paginated<PartyOutstandingRow>;
}) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();

  const pushQuery = (next: OutstandingPartiesInput) => {
    push(queryHref("/reports/outstanding", next));
  };

  const filtered =
    Boolean(query.search) || query.status !== "all";

  const handleRowClick = (row: PartyOutstandingRow) => {
    router.push(`/parties/${row.id}`);
  };

  return (
    <>
      <FilterBar
        action={<ExportButton href={exportHref(query)} />}
        onReset={() =>
          pushQuery({
            search: "",
            status: "all",
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search party name"
        />
        <FormField label="Status" htmlFor="report-out-status">
          <Select
            id="report-out-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({ ...query, status: event.target.value as OutstandingPartiesInput["status"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        caption="Outstanding report (party-wise)"
        columns={[
          {
            key: "party",
            header: "Party",
            render: (row) => (
              <Link href={`/parties/${row.id}`} className="ui-table-link">
                {row.company_name}
              </Link>
            ),
          },
          {
            key: "mobile",
            header: "Mobile",
            render: (row) => row.mobile_number,
          },
          {
            key: "billed",
            header: "Total Billed",
            numeric: true,
            render: (row) => formatInr(row.total_billed),
          },
          {
            key: "paid",
            header: "Paid Amount",
            numeric: true,
            render: (row) => formatInr(row.total_paid),
          },
          {
            key: "outstanding",
            header: "Outstanding Amount",
            numeric: true,
            render: (row) => (
              <span className={amountClass(row.status)}>
                {formatInr(row.outstanding)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge tone={partyStatusTone(row.status)} label={row.status} />
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        loading={queryPending}
        emptyTitle={filtered ? "No parties match the selected filters." : "No parties found."}
        onRowClick={handleRowClick}
        footer={
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            disabled={queryPending}
            onPageChange={(page) => pushQuery({ ...query, page })}
          />
        }
      />
    </>
  );
}