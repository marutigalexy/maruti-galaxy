"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { allocateInvoiceAction, listAllocatableIncomeEntriesAction } from "@/app/actions/entries";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { AllocatableIncomeEntry } from "@/services/allocations/allocations-service";

type InvoiceAllocateDialogProps = {
  invoiceId: string;
  outstanding: number;
};

export function InvoiceAllocateDialog({ invoiceId, outstanding }: InvoiceAllocateDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AllocatableIncomeEntry[]>([]);
  const [rows, setRows] = useState<Array<{ entry_id: string; amount: string }>>([
    { entry_id: "", amount: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const previewUsed = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const previewRemaining = Math.round((outstanding - previewUsed) * 100) / 100;

  function openDialog() {
    setFormError(null);
    setRows([{ entry_id: "", amount: "" }]);
    setOpen(true);
    startTransition(async () => {
      const outcome = await listAllocatableIncomeEntriesAction();
      if (!outcome.ok) {
        toast.error(outcome.error?.message ?? "Unable to load income entries.");
        return;
      }
      setEntries(outcome.data);
    });
  }

  return (
    <>
      {outstanding > 0 ? (
        <Button
          onClick={() => {
            openDialog();
          }}
        >
          Allocate
        </Button>
      ) : null}
      <Dialog
        open={open}
        title="Allocate Income to Invoice"
        onClose={() => setOpen(false)}
        disableClose={pending}
        footer={null}
      >
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const items = rows.filter((row) => row.entry_id && row.amount);
            setFormError(null);
            startTransition(async () => {
              const outcome = await allocateInvoiceAction({
                invoice_id: invoiceId,
                items,
              });
              if (!outcome.ok) {
                setFormError(outcome.error?.message ?? "Unable to allocate.");
                toast.error(outcome.error?.message ?? "Unable to allocate.");
                return;
              }
              setOpen(false);
              toast.success("Allocation saved successfully.");
              router.refresh();
            });
          }}
        >
          <p className="ui-field-help">
            Invoice outstanding {formatInr(outstanding)}. Preview remaining after this form:{" "}
            {formatInr(previewRemaining)}. Server outstanding is final.
          </p>
          {rows.map((row, index) => (
            <div key={`${row.entry_id}-${index}`} className="ui-pagination-controls">
              <FormField label="Income Entry" htmlFor={`inv-alloc-entry-${index}`} required>
                <Select
                  id={`inv-alloc-entry-${index}`}
                  value={row.entry_id}
                  disabled={pending}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = { ...row, entry_id: event.target.value };
                    setRows(next);
                  }}
                >
                  <option value="">Select income entry</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {formatDisplayDate(entry.entry_date)} · remaining {formatInr(entry.remaining)}
                      {entry.party_name ? ` · ${entry.party_name}` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Allocation Amount" htmlFor={`inv-alloc-amount-${index}`} required>
                <Input
                  id={`inv-alloc-amount-${index}`}
                  inputMode="decimal"
                  value={row.amount}
                  disabled={pending}
                  placeholder="e.g. 500.00"
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = { ...row, amount: event.target.value };
                    setRows(next);
                  }}
                />
              </FormField>
              {rows.length > 1 ? (
                <Button variant="ghost" onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button variant="secondary" onClick={() => setRows([...rows, { entry_id: "", amount: "" }])}>
            Add income entry
          </Button>
          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || previewRemaining < 0}>
              {pending ? "Saving…" : "Allocate"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
