"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateEmployeeAction } from "@/app/actions/employees";
import { EmployeePaymentDialog } from "@/components/employees/employee-payment-dialog";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientTabs } from "@/components/ui/client-tabs";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EmployeeRecord, EmployeeSummary, EmployeePaymentRow } from "@/services/employees/employees-service";

type TabKey = "work" | "payments";

function paymentAmountClass(row: EmployeePaymentRow) {
  const name = row.category_name.toLowerCase();
  if (name.includes("salary")) return "ui-amount-salary";
  if (name.includes("advance")) return "ui-amount-advance";
  if (name.includes("bonus")) return "ui-amount-bonus";
  if (name.includes("deduction") || name.includes("fine") || name.includes("penalty")) return "ui-amount-deduction";
  if (row.category_type === "Income") return "ui-amount-income";
  return "ui-amount-expense";
}

function paymentCategoryBadge(row: EmployeePaymentRow) {
  const name = row.category_name.toLowerCase();
  if (name.includes("salary")) return <StatusBadge tone="paid" label="Salary" />;
  if (name.includes("advance")) return <StatusBadge tone="pending" label="Advance" />;
  if (name.includes("bonus")) return <StatusBadge tone="completed" label="Bonus" />;
  if (name.includes("deduction") || name.includes("fine") || name.includes("penalty")) return <StatusBadge tone="unpaid" label="Deduction" />;
  if (row.category_type === "Income") return <StatusBadge tone="income" label={row.category_name} />;
  return <StatusBadge tone="expense" label={row.category_name} />;
}

export function EmployeeDetailView({ employee, summary, accounts, categories }: {
  employee: EmployeeRecord;
  summary: EmployeeSummary;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("work");
  useRecordTitle(employee.name, employee.mobile_number);

  const kpis = [
    { label: "Commission", value: formatInr(employee.commission) },
    { label: "Total Done Than", value: formatThan(summary.total_done_than) },
    { label: "Total Earning", value: formatInr(summary.total_earning) },
    { label: "Paid Amount", value: formatInr(summary.total_paid) },
    { label: "Remaining Amount", value: formatInr(summary.remaining_amount) },
  ];

  const tabItems = [
    { id: "work", label: "Work History" },
    { id: "payments", label: "Payment History" },
  ] as const;

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={employee.is_active ? "active" : "inactive"} />
      </TopbarStatus>
      <TopbarActions>
        <EmployeePaymentDialog
          employee={employee}
          summary={summary}
          accounts={accounts}
          categories={categories}
        />
        <IconButton tone="edit" label="Edit employee" onClick={() => setEditOpen(true)}>
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>
      <div className="ui-detail-stack">
        <section className="ui-section" aria-label="Employee summary">
          <div className="ui-kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="ui-kpi-card">
                <p className="ui-kpi-label">{kpi.label}</p>
                <p className="ui-kpi-value">{kpi.value}</p>
              </article>
            ))}
          </div>
        </section>

        <ClientTabs
          items={tabItems}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Employee history"
        />

        <div role="tabpanel" id="work-panel" aria-labelledby="work-tab" hidden={activeTab !== "work"}>
          <Card title="Work History">
            <DataTable
              caption="Work history"
              columns={[
                {
                  key: "lot",
                  header: "Lot / Sub Job",
                  render: (row) => row.display_no ?? row.lot_number ?? "—",
                },
                {
                  key: "date",
                  header: "Date",
                  render: (row) => formatDisplayDate(row.created_at),
                },
                { key: "than", header: "Done Than", numeric: true, render: (row) => formatThan(row.done_than) },
                {
                  key: "commission",
                  header: "Commission",
                  numeric: true,
                  render: (row) => formatInr(row.commission),
                },
                { key: "earning", header: "Earning", numeric: true, render: (row) => formatInr(row.earning) },
              ]}
              rows={summary.work}
              rowKey={(row) => row.id}
              emptyTitle="No work has been recorded for this employee yet."
            />
          </Card>
        </div>

        <div role="tabpanel" id="payments-panel" aria-labelledby="payments-tab" hidden={activeTab !== "payments"}>
          <Card title="Payment History">
            <DataTable
              caption="Payment history"
              columns={[
                {
                  key: "date",
                  header: "Date",
                  render: (row) => formatDisplayDate(row.entry_date),
                },
                {
                  key: "category",
                  header: "Category",
                  render: (row) => paymentCategoryBadge(row),
                },
                {
                  key: "amount",
                  header: "Amount",
                  numeric: true,
                  render: (row) => (
                    <span className={paymentAmountClass(row)}>{formatInr(row.amount)}</span>
                  ),
                },
                {
                  key: "remarks",
                  header: "Remarks",
                  render: (row) => row.remarks ?? "—",
                },
              ]}
              rows={summary.payments}
              rowKey={(row) => row.id}
              emptyTitle="No payments recorded for this employee yet."
            />
          </Card>
        </div>
      </div>
      <Dialog
        open={editOpen}
        title="Edit Employee"
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
              const outcome = await updateEmployeeAction({
                id: employee.id,
                name: String(form.get("name") ?? ""),
                mobile_number: String(form.get("mobile_number") ?? ""),
                commission: String(form.get("commission") ?? ""),
              });
              if (!outcome.ok) {
                setFormError(outcome.error.message);
                toast.error(outcome.error.message);
                return;
              }
              setEditOpen(false);
              toast.success("Employee updated successfully.");
              router.refresh();
            });
          }}
        >
          <FormField label="Name" htmlFor="detail-edit-employee-name" required>
            <Input
              id="detail-edit-employee-name"
              name="name"
              required
              defaultValue={employee.name}
              disabled={pending}
              placeholder="e.g. Rahul Sharma"
            />
          </FormField>
          <FormField label="Mobile Number" htmlFor="detail-edit-employee-mobile" required>
            <Input
              id="detail-edit-employee-mobile"
              name="mobile_number"
              required
              defaultValue={employee.mobile_number}
              disabled={pending}
              placeholder="e.g. 9876543210"
            />
          </FormField>
          <FormField
            label="Commission"
            htmlFor="detail-edit-commission"
            required
          >
            <Input
              id="detail-edit-commission"
              name="commission"
              inputMode="decimal"
              required
              defaultValue={String(employee.commission)}
              disabled={pending}
              placeholder="e.g. 50.00"
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