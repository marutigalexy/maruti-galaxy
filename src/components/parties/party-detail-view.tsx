import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInr } from "@/lib/formatters";
import type { PartyRecord, PartySummary } from "@/services/parties/parties-service";

type PartyDetailViewProps = {
  party: PartyRecord;
  summary: PartySummary;
};

export function PartyDetailView({ party, summary }: PartyDetailViewProps) {
  return (
    <>
      <PageHeader
        title={party.company_name}
        description="Party information, related jobs, invoices, and outstanding from live records."
      />
      <p className="ui-field-help">
        <Link href="/parties">Back to Parties</Link>
      </p>
      <dl className="ui-detail-grid">
        <div className="ui-detail-item">
          <dt>Company Name</dt>
          <dd>{party.company_name}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Contact Person</dt>
          <dd>{party.contact_person_name ?? "—"}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Mobile Number</dt>
          <dd>{party.mobile_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Default Price</dt>
          <dd>{formatInr(party.price)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Status</dt>
          <dd>
            <StatusBadge tone={party.is_active ? "active" : "inactive"} />
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Jobs</dt>
          <dd>{summary.jobsCount}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Invoices</dt>
          <dd>{summary.invoicesCount}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Outstanding</dt>
          <dd>{formatInr(summary.outstanding)}</dd>
        </div>
      </dl>
      <p className="ui-field-help">
        Changing this party&apos;s default price does not change existing job prices.
      </p>
      <section className="ui-section">
        <h2 className="ui-section-title">Related Jobs</h2>
        <DataTable
          caption="Related jobs"
          columns={[
            { key: "lot", header: "Lot Number", render: (row) => row.lot_number },
            { key: "status", header: "Status", render: (row) => row.status },
            { key: "than", header: "Than", numeric: true, render: (row) => String(row.than) },
            { key: "price", header: "Job Price", numeric: true, render: (row) => formatInr(row.price) },
          ]}
          rows={summary.jobs}
          rowKey={(row) => row.id}
          emptyTitle="No related jobs yet."
        />
      </section>
      <section className="ui-section">
        <h2 className="ui-section-title">Related Invoices</h2>
        <DataTable
          caption="Related invoices"
          columns={[
            {
              key: "number",
              header: "Invoice Number",
              render: (row) => <Link href={`/invoices/${row.id}`}>{row.invoice_number}</Link>,
            },
            { key: "amount", header: "Amount", numeric: true, render: (row) => formatInr(row.amount) },
            { key: "status", header: "Status", render: (row) => row.status },
          ]}
          rows={summary.invoices}
          rowKey={(row) => row.id}
          emptyTitle="No related invoices yet."
        />
      </section>
    </>
  );
}
