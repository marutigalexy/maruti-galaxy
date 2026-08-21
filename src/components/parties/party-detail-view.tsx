"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updatePartyAction } from "@/app/actions/parties";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { PartyPaymentDialog } from "@/components/parties/party-payment-dialog";
import { PartyInvoiceDialog } from "@/components/parties/party-invoice-dialog";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { useToast } from "@/components/ui/toast";
import { formatInr, formatThan } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { PartyInvoiceRow, PartyJobRow, PartyRecord, PartySummary } from "@/services/parties/parties-service";

type PartyDetailViewProps = {
  party: PartyRecord;
  summary: PartySummary;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

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
  const [formError, setFormError] = useState<string | null>(null);
  useRecordTitle(party.company_name, partySubtitle(party));

  const kpis = [
    { label: "Default Price", value: formatInr(party.price) },
    { label: "Jobs", value: String(summary.jobsCount) },
    { label: "Invoices", value: String(summary.invoicesCount) },
    { label: "Outstanding", value: formatInr(summary.outstanding) },
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

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={party.is_active ? "active" : "inactive"} />
      </TopbarStatus>
      <TopbarActions>
        <PartyPaymentDialog
          partyId={party.id}
          outstanding={summary.outstanding}
          accounts={accounts}
          categories={categories}
          invoices={summary.invoices}
        />

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

        <Card title="Related Jobs">
          <DataTable
            caption="Related jobs"
            columns={[
              {
                key: "lot",
                header: "Lot Number",
                render: (row) => row.lot_number,
              },
              {
                key: "type",
                header: "Job Type",
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
            onRowClick={(row) => router.push(`/jobs/${row.id}`)}
            emptyTitle="No related jobs yet."
          />
        </Card>

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
                  <div onClick={(e) => e.stopPropagation()}>
                    <InvoicePrintButton variant="icon" invoiceId={row.id} />
                  </div>
                ),
              },
            ]}
            rows={summary.invoices}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              row.job_work_ids[0] ? router.push(`/jobs/${row.job_work_ids[0]}`) : undefined
            }
            emptyTitle="No invoices have been created for this party."
          />
        </Card>
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
              defaultValue={party.company_name}
              disabled={pending}
              placeholder="e.g. Shree Ram Diamonds"
            />
          </FormField>
          <FormField label="Contact Person Name" htmlFor="detail-edit-contact">
            <Input
              id="detail-edit-contact"
              name="contact_person_name"
              defaultValue={party.contact_person_name ?? ""}
              disabled={pending}
              placeholder="e.g. Amit Patel"
            />
          </FormField>
          <FormField label="Mobile Number" htmlFor="detail-edit-mobile" required>
            <Input
              id="detail-edit-mobile"
              name="mobile_number"
              required
              defaultValue={party.mobile_number}
              disabled={pending}
              placeholder="e.g. 9876543210"
            />
          </FormField>
          <FormField label="Price" htmlFor="detail-edit-price" required>
            <Input
              id="detail-edit-price"
              name="price"
              inputMode="decimal"
              required
              defaultValue={String(party.price)}
              disabled={pending}
              placeholder="e.g. 1500.00"
              className="ui-price"
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
    </>
  );
}
