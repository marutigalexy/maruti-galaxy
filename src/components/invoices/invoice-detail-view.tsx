import Link from "next/link";

import { InvoiceAllocateDialog } from "@/components/invoices/invoice-allocate-dialog";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDisplayDate, formatInr, formatThan, formatWeightCt } from "@/lib/formatters";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoiceDetailViewProps = {
  invoice: InvoiceDetail;
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

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  return (
    <>
      <PageHeader
        title={invoice.invoice_number}
        description="Invoice fields follow the sample labels. Amount is stored on the server as Than × Price."
        action={
          <div className="ui-pagination-controls">
            <InvoiceAllocateDialog invoiceId={invoice.id} outstanding={invoice.outstanding} />
            <InvoicePrintButton invoiceId={invoice.id} invoice={invoice} />
          </div>
        }
      />
      <p className="ui-field-help">
        <Link href="/invoices">Back to Invoices</Link>
      </p>
      <dl className="ui-detail-grid">
        <div className="ui-detail-item">
          <dt>Invoice Number</dt>
          <dd>{invoice.invoice_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>DATE</dt>
          <dd>{formatDisplayDate(invoice.invoice_date)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Party</dt>
          <dd>
            <Link href={`/parties/${invoice.party_id}`}>{invoice.party_name}</Link>
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Job Type</dt>
          <dd>{invoice.job_type}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>DESCRIPTION</dt>
          <dd>—</dd>
        </div>
        <div className="ui-detail-item">
          <dt>KAPAN</dt>
          <dd>{invoice.kapan_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>LOT</dt>
          <dd>
            <Link href={`/jobs/${invoice.job_work_id}`}>{invoice.lot_number}</Link>
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>WEIGHT</dt>
          <dd>{formatWeightCt(invoice.weight)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>THAN</dt>
          <dd>{formatThan(invoice.than)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>RATE</dt>
          <dd>{formatInr(invoice.price)}</dd>
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
        Stored amount {formatInr(invoice.amount)} comes from the invoice record. Than × Price is shown for
        context and is not edited here.
      </p>

      <section className="ui-section">
        <h2 className="ui-section-title">Allocations</h2>
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
      </section>
    </>
  );
}
