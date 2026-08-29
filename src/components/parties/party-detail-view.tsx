"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, useEffect } from "react";

import { deleteEntryAction } from "@/app/actions/entries";
import { deleteInvoiceAction } from "@/app/actions/invoices";
import { updatePartyAction } from "@/app/actions/parties";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { PartyPaymentDialog } from "@/components/parties/party-payment-dialog";
import { PartyInvoiceDialog } from "@/components/parties/party-invoice-dialog";
import { InvoiceConnectedJobsDialog } from "@/components/invoices/invoice-connected-jobs-dialog";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { ClientTabs } from "@/components/ui/client-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { useToast } from "@/components/ui/toast";
import { formatInr, formatSignedInr, formatThan } from "@/lib/formatters";
import { decimalOnly, digitsOnly } from "@/lib/ui/input-filters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type {
  PartyInvoiceRow,
  PartyJobRow,
  PartyPaymentRow,
  PartyRecord,
  PartySummary,
} from "@/services/parties/parties-service";

type PartyDetailViewProps = {
  party: PartyRecord;
  summary: PartySummary;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

type TabKey = "jobs" | "invoices" | "payments";

// For the Related Jobs table we show per-job invoice status by looking up
// whether this job appears in any invoice's job_work_ids list.
type RelatedJobRow = PartyJobRow & {
  invoice: PartyInvoiceRow | null;
};

function partySubtitle(party: PartyRecord) {
  const parts = [party.contact_person_name?.trim(), party.mobile_number.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

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

export function PartyDetailView({ party, summary, accounts, categories }: PartyDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PartyInvoiceRow | null>(null);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<PartyInvoiceRow | null>(null);
  const [cannotDeleteInvoiceTarget, setCannotDeleteInvoiceTarget] = useState<PartyInvoiceRow | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<PartyPaymentRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash === "jobs" || hash === "invoices" || hash === "payments") {
        return hash;
      }
    }
    return "jobs";
  });
  useRecordTitle(party.company_name, partySubtitle(party));

  // Update URL hash when tab changes (preserves history for back button)
  useEffect(() => {
    window.history.replaceState(null, "", `#${activeTab}`);
  }, [activeTab]);

  const kpis = [
    { label: "Default Price", value: formatInr(party.price) },
    { label: "Jobs", value: String(summary.jobsCount) },
    { label: "Invoices", value: String(summary.invoicesCount) },
    {
      label: "Outstanding",
      value: (
        <span className={summary.outstanding < 0 ? "ui-amount-negative" : "ui-amount-positive"}>
          {summary.outstanding < 0
            ? formatSignedInr("Expense", Math.abs(summary.outstanding))
            : formatSignedInr("Income", summary.outstanding)}
        </span>
      ),
    },
  ];

  // All job IDs that already belong to an invoice
  const invoicedJobIds = useMemo(
    () => summary.invoices.flatMap((inv) => inv.job_work_ids),
    [summary.invoices],
  );

  // Map each job to its invoice (for jobs that share an invoice, they all get the same invoice object)
  const relatedJobs = useMemo<RelatedJobRow[]>(() => {
    const invoiceByJobId = new Map<string, PartyInvoiceRow>();
    for (const inv of summary.invoices) {
      for (const jobId of inv.job_work_ids) {
        invoiceByJobId.set(jobId, inv);
      }
    }
    return summary.jobs.map((job) => ({
      ...job,
      invoice: invoiceByJobId.get(job.id) ?? null,
    }));
  }, [summary.invoices, summary.jobs]);

  const tabItems = [
    { id: "jobs", label: "Jobs", count: summary.jobs.length },
    { id: "invoices", label: "Invoices", count: summary.invoices.length },
    { id: "payments", label: "Payment History", count: summary.payments.length },
  ] as const;

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={party.is_active ? "active" : "inactive"} />
      </TopbarStatus>
      <TopbarActions>
        <IconButton
          tone="edit"
          label="Edit party"
          onClick={() => setEditOpen(true)}
        >
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>

      <div className="ui-detail-stack">
        <section className="ui-section" aria-label="Party summary">
          <div className="ui-kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="ui-kpi-card">
                <p className="ui-kpi-label">{kpi.label}</p>
                <p className={kpi.label === "Default Price" ? "ui-kpi-value ui-price" : "ui-kpi-value"}>
                  {kpi.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <ClientTabs
          items={tabItems}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Party details"
        />

        <div role="tabpanel" id="jobs-panel" aria-labelledby="jobs-tab" hidden={activeTab !== "jobs"}>
          <Card
            title="Jobs"
          >
            <DataTable
              caption="Related jobs"
              columns={[
                {
                  key: "lot",
                  header: "Lot Number",
                  render: (row) => row.lot_number,
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
                  key: "billing",
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
              rows={relatedJobs}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/jobs/${row.id}#fromParty=${party.id}&tab=jobs`)}
              emptyTitle="No jobs yet for this party."
            />
          </Card>
        </div>

        <div role="tabpanel" id="invoices-panel" aria-labelledby="invoices-tab" hidden={activeTab !== "invoices"}>
          <Card
            title="Invoices"
            action={
              <PartyInvoiceDialog
                party={party}
                jobs={summary.jobs}
                invoicedJobIds={invoicedJobIds}
              />
            }
          >
            <DataTable
              caption="Party invoices"
              columns={[
                {
                  key: "number",
                  header: "Invoice Number",
                  render: (row) => row.invoice_number,
                },
                {
                  key: "date",
                  header: "Invoice Date",
                  render: (row) => row.invoice_date,
                },
                {
                  key: "jobs",
                  header: "Linked Jobs",
                  render: (row) =>
                    row.lot_numbers.length > 0 ? row.lot_numbers.join(", ") : "—",
                },
                {
                  key: "amount",
                  header: "Invoice Amount",
                  numeric: true,
                  render: (row) => formatInr(row.amount),
                },
                {
                  key: "paid",
                  header: "Paid",
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
                  header: "Payment Status",
                  render: (row) => (
                    <StatusBadge tone={invoiceTone(row.status)} label={row.status} />
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "4px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <InvoicePrintButton variant="icon" invoiceId={row.id} />
                      <IconButton
                        tone="delete"
                        label="Delete invoice"
                        onClick={() => {
                          if (row.status === "Unpaid" && row.allocated === 0) {
                            setDeleteInvoiceTarget(row);
                          } else {
                            setCannotDeleteInvoiceTarget(row);
                          }
                        }}
                      >
                        <DeleteIcon width={16} height={16} />
                      </IconButton>
                    </div>
                  ),
                },
              ]}
              rows={summary.invoices}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedInvoice(row)}
              emptyTitle="No invoices have been created for this party."
            />
          </Card>
        </div>

        <div role="tabpanel" id="payments-panel" aria-labelledby="payments-tab" hidden={activeTab !== "payments"}>
          <Card
            title="Payment History"
            action={
              <PartyPaymentDialog
                partyId={party.id}
                outstanding={summary.outstanding}
                accounts={accounts}
                categories={categories}
                invoices={summary.invoices}
              />
            }
          >
            <DataTable
              caption="Payment history"
              columns={[
                {
                  key: "date",
                  header: "Payment Date",
                  render: (row) => row.entry_date,
                },
                {
                  key: "amount",
                  header: "Amount",
                  numeric: true,
                  render: (row) => formatInr(row.amount),
                },
                {
                  key: "method",
                  header: "Account",
                  render: (row) => row.account_name ?? "—",
                },
                {
                  key: "category",
                  header: "Category",
                  render: (row) => row.category_name ?? "—",
                },
                {
                  key: "remarks",
                  header: "Remarks",
                  render: (row) => row.remarks ?? "—",
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "4px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        tone="delete"
                        label="Delete payment entry"
                        onClick={() => setDeleteEntryTarget(row)}
                      >
                        <DeleteIcon width={16} height={16} />
                      </IconButton>
                    </div>
                  ),
                },
              ]}
              rows={summary.payments ?? []}
              rowKey={(row) => row.id}
              emptyTitle="No payments recorded for this party yet."
            />
          </Card>
        </div>
      </div>

      <Dialog
        open={editOpen}
        title="Edit Party"
        onClose={() => setEditOpen(false)}
        disableClose={pending}
        footer={null}
      >
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setFormError(null);
            startTransition(async () => {
              const outcome = await updatePartyAction({
                id: party.id,
                company_name: String(form.get("company_name") ?? ""),
                contact_person_name: String(form.get("contact_person_name") ?? ""),
                mobile_number: String(form.get("mobile_number") ?? ""),
                price: String(form.get("price") ?? ""),
              });
              if (!outcome.ok) {
                setFormError(outcome.error.message);
                toast.error(outcome.error.message);
                return;
              }
              setEditOpen(false);
              toast.success("Party updated successfully.");
              router.refresh();
            });
          }}
        >
          <FormField label="Company Name" htmlFor="detail-edit-company" required>
            <Input
              id="detail-edit-company"
              name="company_name"
              required
              maxLength={200}
              defaultValue={party.company_name}
              disabled={pending}
              placeholder="e.g. Shree Ram Diamonds"
            />
          </FormField>
          <FormField label="Contact Person Name" htmlFor="detail-edit-contact">
            <Input
              id="detail-edit-contact"
              name="contact_person_name"
              maxLength={100}
              defaultValue={party.contact_person_name ?? ""}
              disabled={pending}
              placeholder="e.g. Amit Patel"
            />
          </FormField>
          <FormField label="Mobile Number" htmlFor="detail-edit-mobile" required>
            <Input
              id="detail-edit-mobile"
              name="mobile_number"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              defaultValue={party.mobile_number}
              disabled={pending}
              placeholder="10-digit mobile number"
              onInput={(e) => {
                e.currentTarget.value = digitsOnly(e.currentTarget.value, 10);
              }}
            />
          </FormField>
          <FormField label="Price/Than" htmlFor="detail-edit-price">
            <Input
              id="detail-edit-price"
              name="price"
              inputMode="decimal"
              defaultValue={party.price > 0 ? String(party.price) : ""}
              disabled={pending}
              placeholder="e.g. 1500.00 (optional)"
              className="ui-price"
              onInput={(e) => {
                e.currentTarget.value = decimalOnly(e.currentTarget.value, 2);
              }}
            />
          </FormField>
          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      <InvoiceConnectedJobsDialog
        invoice={selectedInvoice}
        jobs={summary.jobs}
        partyId={party.id}
        onClose={() => setSelectedInvoice(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteInvoiceTarget)}
        title="Delete Invoice?"
        description={
          deleteInvoiceTarget
            ? `Are you sure you want to delete invoice ${deleteInvoiceTarget.invoice_number}? This will permanently delete the invoice and unlink its ${deleteInvoiceTarget.lot_numbers.length} jobs so they can be invoiced again.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteInvoiceTarget(null)}
        onConfirm={() => {
          if (!deleteInvoiceTarget) return;
          startTransition(async () => {
            const outcome = await deleteInvoiceAction({ id: deleteInvoiceTarget.id });
            if (!outcome.ok) {
              toast.error(outcome.error.message);
              return;
            }
            setDeleteInvoiceTarget(null);
            toast.success("Invoice deleted successfully.");
            router.refresh();
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="Delete Payment Entry?"
        description={
          deleteEntryTarget
            ? `Are you sure you want to delete this payment of ${formatInr(deleteEntryTarget.amount)}? Related invoice allocations, outstanding balances, and account balances will be automatically recalculated.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteEntryTarget(null)}
        onConfirm={() => {
          if (!deleteEntryTarget) return;
          startTransition(async () => {
            const outcome = await deleteEntryAction({ id: deleteEntryTarget.id });
            if (!outcome.ok) {
              toast.error(outcome.error.message);
              return;
            }
            setDeleteEntryTarget(null);
            toast.success("Payment entry deleted successfully.");
            router.refresh();
          });
        }}
      />
      <Dialog
        open={Boolean(cannotDeleteInvoiceTarget)}
        title="Cannot Delete Invoice"
        onClose={() => setCannotDeleteInvoiceTarget(null)}
        disableClose={pending}
        footer={
          <div className="ui-dialog-actions">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => setCannotDeleteInvoiceTarget(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {cannotDeleteInvoiceTarget ? (
          <div className="ui-account-blocked-dialog">
            <p>
              <strong>Invoice {cannotDeleteInvoiceTarget.invoice_number}</strong> cannot be deleted because its status is{" "}
              <strong>{cannotDeleteInvoiceTarget.status}</strong> with{" "}
              <strong>{formatInr(cannotDeleteInvoiceTarget.allocated)}</strong> in payment allocations.
            </p>
            <p className="ui-account-blocked-note">
              Only pending/unpaid invoices with 0 payment allocations can be deleted. To delete this invoice, delete its related payment entries first.
            </p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}