"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { queryHref } from "@/lib/api/query-href";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { ListInvoicesInput } from "@/lib/validation/invoices";
import type { InvoiceListRecord } from "@/services/invoices/invoices-service";
import type { PartyOption } from "@/services/parties/parties-service";

type OutstandingReportViewProps = {
  query: ListInvoicesInput;
  result: Paginated<InvoiceListRecord>;
  parties: PartyOption[];
};

function invoiceTone(status: InvoiceListRecord["status"]) {
  if (status === "Paid") {
    return "paid" as const;
  }
  if (status === "Partially Paid") {
    return "partial" as const;
  }
  return "unpaid" as const;
}

export function OutstandingReportView({ query, result, parties }: OutstandingReportViewProps) {
  const router = useRouter();
  const pushQuery = (next: ListInvoicesInput) => {
    router.push(queryHref("/reports/outstanding", next));
  };
  const filtered =
    Boolean(query.search) ||
    query.status !== "all" ||
    Boolean(query.party_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  return (
    <>
      <FilterBar
        onReset={() =>
          pushQuery({
            search: "",
            status: "all",
            party_id: undefined,
            date_from: undefined,
            date_to: undefined,
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search invoice number or lot"
        />
        <FormField label="Status" htmlFor="report-out-status">
          <Select
            id="report-out-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({ ...query, status: event.target.value as ListInvoicesInput["status"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </Select>
        </FormField>
        <FormField label="Party" htmlFor="report-out-party">
          <Select
            id="report-out-party"
            value={query.party_id ?? ""}
            onChange={(event) => pushQuery({ ...query, party_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.company_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date From" htmlFor="report-out-from">
          <DatePicker
            id="report-out-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-out-to">
          <DatePicker
            id="report-out-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })}
          />
        </FormField>
      </FilterBar>
      <DataTable
        caption="Outstanding report"
        columns={[
          { key: "party", header: "Party", render: (row) => row.party_name },
          { key: "number", header: "Invoice Number", render: (row) => row.invoice_number },
          { key: "lot", header: "Lot Number", render: (row) => <Link href={`/jobs/${row.job_work_id}`}>{row.lot_number}</Link> },
          { key: "amount", header: "Invoice Amount", numeric: true, render: (row) => formatInr(row.amount) },
          { key: "allocated", header: "Allocated", numeric: true, render: (row) => formatInr(row.allocated) },
          {
            key: "outstanding",
            header: "Outstanding",
            numeric: true,
            render: (row) => formatInr(row.outstanding),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge tone={invoiceTone(row.status)} label={row.status} />,
          },
          { key: "date", header: "Date", render: (row) => formatDisplayDate(row.invoice_date) },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        emptyTitle={filtered ? "No invoices match the selected filters." : "No invoices found."}
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
