"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPartyPaymentAction } from "@/app/actions/entries";
import { DatePicker } from "@/components/ui/date-picker";
import { AddButton } from "@/components/ui/add-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { PartyInvoiceRow } from "@/services/parties/parties-service";

type PartyPaymentDialogProps = {
  partyId: string;
  outstanding: number;
  accounts: AccountOption[];
  categories: CategoryOption[];
  invoices: PartyInvoiceRow[];
};

function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function PartyPaymentDialog({
  partyId,
  outstanding,
  accounts,
  categories,
  invoices,
}: PartyPaymentDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payNow, setPayNow] = useState<Record<string, string>>({});

  const outstandingInvoices = invoices.filter((inv) => inv.outstanding > 0);

  const totalToCollect = outstandingInvoices.reduce((sum, inv) => {
    const val = parseFloat(payNow[inv.id] ?? "");
    return sum + (Number.isFinite(val) && val > 0 ? val : 0);
  }, 0);

  function openDialog() {
    setPayNow({});
    setFormError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!pending) setOpen(false);
  }

  function setAmount(invoiceId: string, value: string) {
    setPayNow((prev) => ({ ...prev, [invoiceId]: value }));
  }

  return (
    <>
      <AddButton onClick={openDialog}>Add Payment</AddButton>

      <Dialog
        open={open}
        title="Collect Payment"
        onClose={handleClose}
        disableClose={pending}
        footer={null}
      >
        <form
          className="ui-dialog-form ui-collect-payment-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);

            const items = outstandingInvoices
              .map((inv) => ({
                invoice_id: inv.id,
                amount: payNow[inv.id] ?? "",
              }))
              .filter(({ amount }) => {
                const v = parseFloat(amount);
                return Number.isFinite(v) && v > 0;
              });

            if (items.length === 0) {
              setFormError("Enter a Pay Now amount for at least one invoice.");
              return;
            }

            setFormError(null);
            startTransition(async () => {
              const outcome = await createPartyPaymentAction({
                party_id: partyId,
                account_id: String(form.get("account_id") ?? ""),
                category_id: String(form.get("category_id") ?? ""),
                entry_date: String(form.get("entry_date") ?? ""),
                remarks: String(form.get("remarks") ?? ""),
                items,
              });
              if (!outcome.ok) {
                setFormError(
                  outcome.error?.message ?? "Unable to record payment.",
                );
                toast.error(
                  outcome.error?.message ?? "Unable to record payment.",
                );
                return;
              }
              setOpen(false);
              toast.success("Payment recorded successfully.");
              router.refresh();
            });
          }}
        >
          {/* Account */}
          <FormField label="Account" htmlFor="pp-account" required>
            <Select
              id="pp-account"
              name="account_id"
              required
              disabled={pending}
            >
              <option value="">Select account</option>
              {accounts
                .filter((a) => a.is_active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </FormField>

          {/* Category */}
          <FormField label="Category" htmlFor="pp-category" required>
            <Select
              id="pp-category"
              name="category_id"
              required
              disabled={pending}
            >
              <option value="">Select category</option>
              {categories
                .filter((c) => c.type === "Income" && c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </FormField>

          {/* Payment date */}
          <FormField label="Payment Date" htmlFor="pp-date" required>
            <DatePicker
              id="pp-date"
              name="entry_date"
              required
              defaultValue={todayIso()}
              disabled={pending}
            />
          </FormField>

          {/* Note */}
          <FormField label="Note" htmlFor="pp-remarks">
            <Textarea
              id="pp-remarks"
              name="remarks"
              disabled={pending}
              placeholder="Any internal notes for this payment..."
            />
          </FormField>

          {/* ── Open Invoices ── */}
          <div className="ui-inline-table-section">
            <div className="ui-inline-table-header">
              <span className="ui-inline-table-title">Open Invoices</span>
              <span className="ui-inline-table-badge">
                Total to collect: {formatInr(totalToCollect)}
              </span>
            </div>

            {outstandingInvoices.length === 0 ? (
              <p className="ui-field-help ui-inline-table-empty">
                No outstanding invoices for this party.
              </p>
            ) : (
              <div className="ui-table-wrap ui-inline-table-wrap">
                <table className="ui-table ui-inline-table">
                  <thead>
                    <tr>
                      <th>Invoice No.</th>
                      <th>Date</th>
                      <th className="is-numeric">Total</th>
                      <th className="is-numeric">Paid</th>
                      <th className="is-numeric">Remaining</th>
                      <th className="is-numeric">Pay Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="ui-col-monospace">
                          {inv.invoice_number}
                        </td>
                        <td>{inv.invoice_date}</td>
                        <td className="is-numeric">{formatInr(inv.amount)}</td>
                        <td className="is-numeric">
                          {formatInr(inv.allocated)}
                        </td>
                        <td className="is-numeric">
                          {formatInr(inv.outstanding)}
                        </td>
                        <td className="is-numeric">
                          <Input
                            aria-label={`Pay now for ${inv.invoice_number}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={payNow[inv.id] ?? ""}
                            onChange={(e) => setAmount(inv.id, e.target.value)}
                            disabled={pending}
                            className="ui-pay-now-input"
                          />
                        </td>
                      </tr>
                    ))}
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
            <Button
              variant="secondary"
              disabled={pending}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={outstandingInvoices.length === 0 || totalToCollect <= 0}
            >
              Save Payment
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
