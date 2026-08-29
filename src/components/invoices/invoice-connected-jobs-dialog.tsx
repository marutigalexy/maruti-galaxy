"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteInvoiceAction } from "@/app/actions/invoices";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon } from "@/components/ui/icons";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { PartyInvoiceRow, PartyJobRow } from "@/services/parties/parties-service";

type InvoiceConnectedJobsDialogProps = {
  invoice: PartyInvoiceRow | null;
  jobs: PartyJobRow[];
  partyId: string;
  onClose: () => void;
};

function jobTone(status: string) {
  if (status === "Progress") return "progress" as const;
  if (status === "Completed") return "completed" as const;
  return "pending" as const;
}

function invoiceTone(status: string) {
  if (status === "Paid") return "paid" as const;
  if (status === "Partially Paid") return "partial" as const;
  return "unpaid" as const;
}

export function InvoiceConnectedJobsDialog({
  invoice,
  jobs,
  partyId,
  onClose,
}: InvoiceConnectedJobsDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cannotDeleteOpen, setCannotDeleteOpen] = useState(false);

  const connectedJobs = useMemo(() => {
    if (!invoice) return [];
    const idSet = new Set(invoice.job_work_ids);
    return jobs.filter((job) => idSet.has(job.id));
  }, [invoice, jobs]);

  if (!invoice) {
    return null;
  }

  return (
    <>
      <Dialog
        open={Boolean(invoice)}
        className="ui-subjob-detail-dialog ui-invoice-detail-dialog"
        title={`Invoice Details • ${invoice.invoice_number}`}
        onClose={onClose}
        headerActions={
          <div className="ui-dialog-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <StatusBadge tone={invoiceTone(invoice.status)} label={invoice.status} />
            <InvoicePrintButton variant="icon" invoiceId={invoice.id} />
            <IconButton
              tone="delete"
              label="Delete invoice"
              disabled={pending}
              onClick={() => {
                if (invoice.status === "Unpaid" && invoice.allocated === 0) {
                  setDeleteConfirmOpen(true);
                } else {
                  setCannotDeleteOpen(true);
                }
              }}
            >
              <DeleteIcon width={16} height={16} />
            </IconButton>
          </div>
        }
        footer={null}
      >
        <div className="ui-subjob-detail-dialog-content">
          {/* Top Summary KPI Cards */}
          <section className="ui-subjob-kpi-grid">
            <div className="ui-subjob-kpi-card">
              <span className="ui-subjob-kpi-label">Invoice Date</span>
              <strong className="ui-subjob-kpi-val">{formatDisplayDate(invoice.invoice_date)}</strong>
            </div>
            <div className="ui-subjob-kpi-card">
              <span className="ui-subjob-kpi-label">Invoice Amount</span>
              <strong className="ui-subjob-kpi-val ui-price">{formatInr(invoice.amount)}</strong>
            </div>
            <div className="ui-subjob-kpi-card">
              <span className="ui-subjob-kpi-label">Paid Amount</span>
              <strong className="ui-subjob-kpi-val ui-price">{formatInr(invoice.allocated)}</strong>
            </div>
            <div className="ui-subjob-kpi-card">
              <span className="ui-subjob-kpi-label">Outstanding</span>
              <strong className="ui-subjob-kpi-val ui-price">{formatInr(invoice.outstanding)}</strong>
            </div>
            <div className="ui-subjob-kpi-card">
              <span className="ui-subjob-kpi-label">Connected Jobs</span>
              <strong className="ui-subjob-kpi-val">{connectedJobs.length}</strong>
            </div>
          </section>

          {/* Connected Jobs List */}
          <Card title={`Connected Jobs (${connectedJobs.length})`}>
            <DataTable<PartyJobRow>
              caption="Connected Jobs"
              emptyTitle="No connected jobs found for this invoice."
              rows={connectedJobs}
              rowKey={(row) => row.id}
              getRowProps={() => ({
                className: "is-clickable",
              })}
              onRowClick={(row) => {
                onClose();
                router.push(`/jobs/${row.id}#fromParty=${partyId}&tab=invoices`);
              }}
              columns={[
                {
                  key: "lot_number",
                  header: "Job Number",
                  render: (row) => <strong>{row.lot_number}</strong>,
                },
                {
                  key: "kapan_number",
                  header: "Kapan",
                  render: (row) => row.kapan_number,
                },
                {
                  key: "job_type",
                  header: "Type",
                  render: (row) => <JobTypeBadge type={row.job_type} />,
                },
                {
                  key: "than",
                  header: "Than",
                  numeric: true,
                  render: (row) => formatThan(row.than),
                },
                {
                  key: "weight",
                  header: "Weight",
                  numeric: true,
                  render: (row) => <WeightCt value={row.weight} />,
                },
                {
                  key: "price",
                  header: "Price",
                  numeric: true,
                  render: (row) => formatInr(row.price),
                },
                {
                  key: "billing_amount",
                  header: "Billing Amount",
                  numeric: true,
                  render: (row) => formatInr(row.billing_amount),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusBadge tone={jobTone(row.status)} />,
                },
              ]}
            />
          </Card>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Invoice?"
        description={`Are you sure you want to delete invoice ${invoice.invoice_number}? This will permanently delete the invoice and unlink its ${connectedJobs.length} jobs so they can be invoiced again.`}
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            const outcome = await deleteInvoiceAction({ id: invoice.id });
            if (!outcome.ok) {
              toast.error(outcome.error.message);
              return;
            }
            setDeleteConfirmOpen(false);
            onClose();
            toast.success("Invoice deleted successfully.");
            router.refresh();
          });
        }}
      />

      <Dialog
        open={cannotDeleteOpen}
        title="Cannot Delete Invoice"
        onClose={() => setCannotDeleteOpen(false)}
        disableClose={pending}
        footer={
          <div className="ui-dialog-actions">
            <Button variant="primary" onClick={() => setCannotDeleteOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="ui-account-blocked-dialog">
          <p>
            <strong>Invoice {invoice.invoice_number}</strong> cannot be deleted because its status is{" "}
            <strong>{invoice.status}</strong> with <strong>{formatInr(invoice.allocated)}</strong> in payment allocations.
          </p>
          <p className="ui-account-blocked-note">
            Only pending/unpaid invoices with 0 payments can be deleted. If you need to delete this invoice, delete or reassign its related payment entries first.
          </p>
        </div>
      </Dialog>
    </>
  );
}
