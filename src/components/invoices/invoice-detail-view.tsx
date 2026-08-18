import { InvoicePaymentDialog } from "@/components/invoices/invoice-payment-dialog";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoiceDetailViewProps = {
  invoice: InvoiceDetail;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

function invoiceTone(status: InvoiceDetail["status"]) {
  if (status === "Paid") {
    return "paid" as const;
  }
  if (status === "Partially Paid") {
    return "partial" as const;
  }
  return "unpaid" as const;
}

export function InvoiceDetailView({ invoice, accounts, categories }: InvoiceDetailViewProps) {
  return (
    <Card
      title="Invoice"
      action={<InvoicePaymentDialog invoice={invoice} accounts={accounts} categories={categories} />}
    >
      <dl className="ui-property-list">
        <div className="ui-detail-item">
          <dt>Invoice Number</dt>
          <dd>{invoice.invoice_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>DATE</dt>
          <dd>{formatDisplayDate(invoice.invoice_date)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>DESCRIPTION</dt>
          <dd>—</dd>
        </div>
        <div className="ui-detail-item">
          <dt>TOTAL</dt>
          <dd>{formatInr(invoice.amount)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Allocated</dt>
          <dd>{formatInr(invoice.allocated)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Outstanding</dt>
          <dd>{formatInr(invoice.outstanding)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Status</dt>
          <dd>
            <StatusBadge tone={invoiceTone(invoice.status)} label={invoice.status} />
          </dd>
        </div>
      </dl>
      <p className="ui-field-help">
        Stored amount {formatInr(invoice.amount)} comes from the invoice record. Than × Price is shown for context and
        is not edited here.
      </p>
      <h3 className="ui-card-title">Allocations</h3>
      <p className="ui-field-help">
        One income entry can settle many invoices, and one invoice can use many income entries.
      </p>
      <DataTable
        caption="Invoice allocations"
        columns={[
          { key: "date", header: "Entry Date", render: (row) => formatDisplayDate(row.entry_date) },
          {
            key: "entry_amount",
            header: "Entry Amount",
            numeric: true,
            render: (row) => formatInr(row.entry_amount),
          },
          {
            key: "allocated",
            header: "Allocated Amount",
            numeric: true,
            render: (row) => formatInr(row.allocated_amount),
          },
          { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "—" },
        ]}
        rows={invoice.allocations}
        rowKey={(row) => row.id}
        emptyTitle="No allocations yet."
      />
    </Card>
  );
}
