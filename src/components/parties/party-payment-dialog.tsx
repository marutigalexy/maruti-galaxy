"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createPartyPaymentAction } from "@/app/actions/entries";
import { PaymentEntryFields } from "@/components/payments/payment-entry-fields";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { planFifoAllocations, type AllocatableInvoice } from "@/lib/allocations/plan";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { PartyInvoiceRow } from "@/services/parties/parties-service";

type PartyPaymentDialogProps = {
  partyId: string;
  outstanding: number;
  invoices: PartyInvoiceRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
};

export function PartyPaymentDialog({
  partyId,
  outstanding,
  invoices,
  accounts,
  categories,
}: PartyPaymentDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const allocatable = useMemo<AllocatableInvoice[]>(
    () =>
      invoices
        .filter((invoice) => invoice.outstanding > 0)
        .map((invoice) => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          lot_number: invoice.lot_number,
          outstanding: invoice.outstanding,
        })),
    [invoices],
  );
  const preview = planFifoAllocations(allocatable, Number(amount) || 0);

  function openDialog() {
    setFormError(null);
    setAmount("");
    setOpen(true);
  }

  return (
    <>
      <Button onClick={openDialog}>Payment</Button>
      <Dialog open={open} title="Payment" onClose={() => setOpen(false)} disableClose={pending} footer={null}>
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setFormError(null);
            startTransition(async () => {
              const outcome = await createPartyPaymentAction({
                party_id: partyId,
                account_id: String(form.get("account_id") ?? ""),
                category_id: String(form.get("category_id") ?? ""),
                entry_date: String(form.get("entry_date") ?? ""),
                amount: String(form.get("amount") ?? ""),
                remarks: String(form.get("remarks") ?? ""),
              });
              if (!outcome.ok) {
                setFormError(outcome.error?.message ?? "Unable to record payment.");
                toast.error(outcome.error?.message ?? "Unable to record payment.");
                return;
              }
              setOpen(false);
              toast.success("Payment recorded successfully.");
              router.refresh();
            });
          }}
        >
          <PaymentEntryFields
            idPrefix="party-pay"
            pending={pending}
            accounts={accounts}
            categories={categories}
            amount={amount}
            onAmountChange={setAmount}
          />
          <div>
            <h3 className="ui-card-title">Allocation preview</h3>
            <DataTable
              caption="FIFO allocation preview"
              columns={[
                { key: "number", header: "Invoice", render: (row) => row.invoice_number },
                { key: "date", header: "Date", render: (row) => formatDisplayDate(row.invoice_date) },
                { key: "lot", header: "Lot", render: (row) => row.lot_number },
                {
                  key: "apply",
                  header: "Apply",
                  numeric: true,
                  render: (row) => formatInr(row.amount),
                },
                {
                  key: "remaining",
                  header: "Remaining after",
                  numeric: true,
                  render: (row) => formatInr(row.outstanding - row.amount),
                },
              ]}
              rows={preview.items}
              rowKey={(row) => row.id}
              emptyTitle={
                allocatable.length === 0
                  ? "No outstanding invoices. The full payment stays unallocated."
                  : "Enter an amount to preview FIFO allocation."
              }
            />
            {amount ? (
              <p className="ui-field-help">
                Allocated {formatInr(preview.allocated)}
                {preview.unallocated > 0 ? ` · Unallocated ${formatInr(preview.unallocated)}` : ""}.
              </p>
            ) : null}
          </div>
          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save payment"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
