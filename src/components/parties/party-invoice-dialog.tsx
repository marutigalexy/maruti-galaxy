"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createInvoiceAction } from "@/app/actions/invoices";
import { AddButton } from "@/components/ui/add-button";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { PartyJobRow, PartyRecord } from "@/services/parties/parties-service";

type PartyInvoiceDialogProps = {
  party: PartyRecord;
  jobs: PartyJobRow[];
  invoicedJobIds: string[];
};

function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function PartyInvoiceDialog({ party, jobs, invoicedJobIds }: PartyInvoiceDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [formError, setFormError] = useState<string | null>(null);

  const eligibleJobs = useMemo(
    () => jobs.filter((job) => !invoicedJobIds.includes(job.id)),
    [jobs, invoicedJobIds],
  );

  const totalInvoiceAmount = useMemo(
    () =>
      eligibleJobs
        .filter((job) => selectedIds.has(job.id))
        .reduce((sum, job) => sum + job.billing_amount, 0),
    [eligibleJobs, selectedIds],
  );

  const allSelected = eligibleJobs.length > 0 && selectedIds.size === eligibleJobs.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleJob(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(eligibleJobs.map((j) => j.id)),
    );
  }

  function openDialog() {
    setSelectedIds(new Set());
    setInvoiceDate(todayIso());
    setFormError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <AddButton onClick={openDialog}>Generate Invoice</AddButton>

      <Dialog
        open={open}
        title="Generate Invoice"
        onClose={handleClose}
        disableClose={pending}
        footer={null}
      >
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedIds.size === 0) {
              setFormError("Select at least one job.");
              return;
            }
            setFormError(null);
            startTransition(async () => {
              const outcome = await createInvoiceAction({
                party_id: party.id,
                job_ids: [...selectedIds],
                invoice_date: invoiceDate,
              });
              if (!outcome.ok) {
                setFormError(outcome.error.message);
                toast.error(outcome.error.message);
                return;
              }
              setOpen(false);
              toast.success(`Invoice ${outcome.data.invoice_number} created.`);
              router.refresh();
            });
          }}
        >
          {/* Party — read-only */}
          <FormField label="Party" htmlFor="inv-party">
            <Input id="inv-party" value={party.company_name} disabled readOnly />
          </FormField>

          {/* Invoice date */}
          <FormField label="Invoice Date" htmlFor="inv-date" required>
            <DatePicker
              id="inv-date"
              name="invoice_date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={pending}
            />
          </FormField>

          {/* ── Eligible Jobs ── */}
          <div className="ui-inline-table-section">
            <div className="ui-inline-table-header">
              <span className="ui-inline-table-title">Eligible Jobs</span>
              {selectedIds.size > 0 && (
                <span className="ui-inline-table-badge">
                  Total Invoice Amount: {formatInr(totalInvoiceAmount)}
                </span>
              )}
            </div>

            {eligibleJobs.length === 0 ? (
              <p className="ui-field-help ui-inline-table-empty">
                All jobs have already been invoiced.
              </p>
            ) : (
              <div className="ui-table-wrap ui-inline-table-wrap">
                <table className="ui-table ui-inline-table">
                  <thead>
                    <tr>
                      <th className="ui-col-check">
                        <input
                          type="checkbox"
                          aria-label="Select all jobs"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={toggleAll}
                          disabled={pending}
                        />
                      </th>
                      <th>Job No.</th>
                      <th>Date</th>
                      <th className="is-numeric">Billing Amount</th>
                      <th className="is-numeric">Paid</th>
                      <th className="is-numeric">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleJobs.map((job) => {
                      const selected = selectedIds.has(job.id);
                      return (
                        <tr
                          key={job.id}
                          className={selected ? "ui-inline-table-row-selected is-clickable" : "is-clickable"}
                          onClick={() => !pending && toggleJob(job.id)}
                        >
                          <td
                            className="ui-col-check"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${job.lot_number}`}
                              checked={selected}
                              onChange={() => toggleJob(job.id)}
                              disabled={pending}
                            />
                          </td>
                          <td className="ui-col-monospace">{job.lot_number}</td>
                          <td>
                            {formatDisplayDate(job.created_at)}
                          </td>
                          <td className="is-numeric">{formatInr(job.billing_amount)}</td>
                          <td className="is-numeric">{formatInr(0)}</td>
                          <td className="is-numeric">{formatInr(job.billing_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={selectedIds.size === 0 || eligibleJobs.length === 0}
            >
              Generate Invoice
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
