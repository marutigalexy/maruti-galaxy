"use client";

import { useRouter } from "next/navigation";

import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { ListInvoicesInput } from "@/lib/validation/invoices";
import type { InvoiceListRecord } from "@/services/invoices/invoices-service";
import type { PartyOption } from "@/services/parties/parties-service";

type InvoicesViewProps = {
  query: ListInvoicesInput;
  result: Paginated<InvoiceListRecord>;
  parties: PartyOption[];
};

function invoicesHref(query: ListInvoicesInput): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.party_id) {
    params.set("party_id", query.party_id);
  }
  if (query.date_from) {
    params.set("date_from", query.date_from);
  }
  if (query.date_to) {
    params.set("date_to", query.date_to);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  const qs = params.toString();
  return qs ? `/invoices?${qs}` : "/invoices";
}

function invoiceTone(status: InvoiceListRecord["status"]) {
  if (status === "Paid") {
    return "paid" as const;
  }
  if (status === "Partially Paid") {
    return "partial" as const;
  }
  return "unpaid" as const;
}

export function InvoicesView({ query, result, parties }: InvoicesViewProps) {
  const router = useRouter();

  const pushQuery = (next: ListInvoicesInput) => {
    router.push(invoicesHref(next));
  };

  const filteredEmpty =
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
        <FormField label="Status" htmlFor="invoice-status-filter">
          <Select
            id="invoice-status-filter"
            value={query.status}
            onChange={(event) =>
              pushQuery({
                ...query,
                status: event.target.value as ListInvoicesInput["status"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </Select>
        </FormField>
        <FormField label="Party" htmlFor="invoice-party-filter">
          <Select
            id="invoice-party-filter"
            value={query.party_id ?? ""}
            onChange={(event) =>
              pushQuery({
                ...query,
                party_id: event.target.value || undefined,
                page: 1,
              })
            }
          >
            <option value="">All</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.company_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date From" htmlFor="invoice-date-from">
          <DatePicker
            id="invoice-date-from"
            value={query.date_from ?? ""}
            onChange={(event) =>
              pushQuery({
                ...query,
                date_from: event.target.value || undefined,
                page: 1,
              })
            }
          />
        </FormField>
        <FormField label="Date To" htmlFor="invoice-date-to">
          <DatePicker
            id="invoice-date-to"
            value={query.date_to ?? ""}
            onChange={(event) =>
              pushQuery({
                ...query,
                date_to: event.target.value || undefined,
                page: 1,
              })
            }
          />
        </FormField>
      </FilterBar>
      <DataTable
        caption="Invoices"
        columns={[
          { key: "number", header: "Invoice Number", render: (row) => row.invoice_number },
          { key: "date", header: "Date", render: (row) => formatDisplayDate(row.invoice_date) },
          { key: "lot", header: "Lot Number", render: (row) => row.lot_number },
          { key: "party", header: "Party", render: (row) => row.party_name },
          { key: "amount", header: "Amount", numeric: true, render: (row) => formatInr(row.amount) },
          {
            key: "allocated",
            header: "Allocated",
            numeric: true,
            render: (row) => formatInr(row.allocated),
          },
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
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <TableActions>
                <InvoicePrintButton variant="icon" invoiceId={row.id} />
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/invoices/${row.id}`)}
        emptyTitle={filteredEmpty ? "No invoices match the selected filters." : "No invoices found."}
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
