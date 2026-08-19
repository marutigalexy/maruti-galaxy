"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createEmployeePaymentAction } from "@/app/actions/entries";
import { PaymentEntryFields } from "@/components/payments/payment-entry-fields";
import { AddButton } from "@/components/ui/add-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EmployeeRecord, EmployeeSummary } from "@/services/employees/employees-service";

type EmployeePaymentDialogProps = {
  employee: EmployeeRecord;
  summary: EmployeeSummary;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

function remainingAfterPayment(remaining: number, amount: string) {
  return Math.round((remaining - (Number(amount) || 0)) * 100) / 100;
}

export function EmployeePaymentDialog({
  employee,
  summary,
  accounts,
  categories,
}: EmployeePaymentDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openDialog() {
    setFormError(null);
    setAmount(summary.remaining_amount > 0 ? summary.remaining_amount.toFixed(2) : "");
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
              const outcome = await createEmployeePaymentAction({
                employee_id: employee.id,
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
              <dt>Total Earning</dt>
              <dd>{formatInr(summary.total_earning)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Paid</dt>
              <dd>{formatInr(summary.total_paid)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Remaining</dt>
              <dd>{formatInr(summary.remaining_amount)}</dd>
            </div>
          </dl>
          <PaymentEntryFields
            idPrefix="employee-pay"
            pending={pending}
            accounts={accounts}
            categories={categories}
            categoryType="Expense"
            amount={amount}
            onAmountChange={setAmount}
          />
          {amount ? (
            <p className="ui-field-help">
              After this payment, remaining salary will be{" "}
              {formatInr(remainingAfterPayment(summary.remaining_amount, amount))}. Server remaining is final.
            </p>
          ) : (
            <p className="ui-field-help">Salary payments are recorded as an expense entry for this employee.</p>
          )}
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
