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
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatSignedInr, formatThan } from "@/lib/formatters";
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
    { label: "Employee Type", value: <JobTypeBadge type={employee.employee_type} /> },
    { label: "Commission", value: formatInr(employee.commission) },
    { label: "Total Done Than", value: formatThan(summary.total_done_than) },
    {
      label: "Total Earning",
      value: (
        <span className="ui-amount-income">
          {formatSignedInr("Income", summary.total_earning)}
        </span>
      ),
    },
    {
      label: "Paid Amount",
      value: (
        <span className="ui-amount-expense">
          {formatSignedInr("Expense", summary.total_paid)}
        </span>
      ),
    },
    {
      label: "Remaining Amount",
      value: (
        <span className={summary.remaining_amount < 0 ? "ui-amount-negative" : "ui-amount-positive"}>
          {summary.remaining_amount < 0
            ? formatSignedInr("Expense", Math.abs(summary.remaining_amount))
            : formatSignedInr("Income", summary.remaining_amount)}
        </span>
      ),
    },
  ];

  const tabItems = [
    { id: "work", label: "Work History", count: summary.work.length },
    { id: "payments", label: "Payment History", count: summary.payments.length },
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
                <div className="ui-kpi-value">{kpi.value}</div>
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
                {
                  key: "done",
                  header: "Done Than",
                  numeric: true,
                  render: (row) => formatThan(row.done_than),
                },
                {
                  key: "commission",
                  header: "Commission",
                  numeric: true,
                  render: (row) => formatInr(row.commission),
                },
                {
                  key: "earning",
                  header: "Earning",
                  numeric: true,
                  render: (row) => formatInr(row.earning),
                },
              ]}
              rows={summary.work}
              rowKey={(row) => row.id}
              emptyTitle="No work history recorded for this employee."
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
                  key: "remarks",
                  header: "Remarks",
                  render: (row) => row.remarks ?? "—",
                },
                {
                  key: "amount",
                  header: "Amount",
                  numeric: true,
                  render: (row) => (
                    <span className={paymentAmountClass(row)}>{formatInr(row.amount)}</span>
                  ),
                },
              ]}
              rows={summary.payments}
              rowKey={(row) => row.id}
              emptyTitle="No payments recorded for this employee."
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
                employee_type: String(form.get("employee_type") ?? "Sarin"),
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
          <FormField label="Employee Type" htmlFor="detail-edit-employee-type" required>
            <Select
              id="detail-edit-employee-type"
              name="employee_type"
              required
              defaultValue={employee.employee_type}
              disabled={pending}
            >
              <option value="Sarin">Sarin</option>
              <option value="Dropping">Dropping</option>
              <option value="Galaxy">Galaxy</option>
            </Select>
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