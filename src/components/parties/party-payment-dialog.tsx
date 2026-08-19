"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPartyPaymentAction } from "@/app/actions/entries";
import { PaymentEntryFields } from "@/components/payments/payment-entry-fields";
import { AddButton } from "@/components/ui/add-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";

type PartyPaymentDialogProps = {
  partyId: string;
  outstanding: number;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

export function PartyPaymentDialog({
  partyId,
  outstanding,
  accounts,
  categories,
}: PartyPaymentDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
          <dl className="ui-summary-grid">
            <div className="ui-detail-item">
              <dt>Outstanding Payment</dt>
              <dd>{formatInr(outstanding)}</dd>
            </div>
          </dl>
          <PaymentEntryFields
            idPrefix="party-pay"
            pending={pending}
            accounts={accounts}
            categories={categories}
            amount={amount}
            onAmountChange={setAmount}
          />
          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save payment
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
