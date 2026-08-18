"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createInvoicePaymentAction } from "@/app/actions/entries";
import { PaymentEntryFields } from "@/components/payments/payment-entry-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { planInvoiceAllocation } from "@/lib/allocations/plan";
import { formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";
import { AddButton } from "../ui/add-button";

type InvoicePaymentDialogProps = {
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

export function InvoicePaymentDialog({ invoice, accounts, categories }: InvoicePaymentDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const preview = planInvoiceAllocation(invoice.outstanding, Number(amount) || 0);

  function openDialog() {
    setFormError(null);
    setAmount("");
    setOpen(true);
  }

  return (
    <>
      <AddButton onClick={openDialog}>Add Payment</AddButton>
      <Dialog open={open} title="Payment" onClose={() => setOpen(false)} disableClose={pending} footer={null}>
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setFormError(null);
            startTransition(async () => {
              const outcome = await createInvoicePaymentAction({
                invoice_id: invoice.id,
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
          <dl className="ui-summary-grid">
            <div className="ui-detail-item">
              <dt>Invoice Total</dt>
              <dd>{formatInr(invoice.amount)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Paid</dt>
              <dd>{formatInr(invoice.allocated)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Remaining</dt>
              <dd>{formatInr(invoice.outstanding)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={invoiceTone(invoice.status)} label={invoice.status} />
              </dd>
            </div>
          </dl>
          <PaymentEntryFields
            idPrefix="job-pay"
            pending={pending}
            accounts={accounts}
            categories={categories}
            amount={amount}
            onAmountChange={setAmount}
          />
          {amount ? (
            <p className="ui-field-help">
              Allocation preview: {formatInr(preview.allocated)} to this invoice
              {preview.unallocated > 0 ? ` · ${formatInr(preview.unallocated)} unallocated` : ""}. Server remaining is
              final.
            </p>
          ) : null}
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
