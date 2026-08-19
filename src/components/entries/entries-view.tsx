"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  allocateEntryAction,
  createEntryAction,
  deleteEntryAction,
  listOutstandingInvoicesAction,
  updateEntryAction,
} from "@/app/actions/entries";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { AllocateIcon, DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { SummaryGridSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { OutstandingInvoiceOption } from "@/services/allocations/allocations-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { EntryListRecord, EntrySummary } from "@/services/entries/entries-service";
import type { PartyOption } from "@/services/parties/parties-service";

type EntriesViewProps = {
  query: ListEntriesInput;
  result: {
    records: EntryListRecord[];
    page: number;
    pageSize: number;
    totalCount: number;
    summary: EntrySummary;
  };
  accounts: AccountOption[];
  categories: CategoryOption[];
  parties: PartyOption[];
  employees: EmployeeOption[];
};

type EntryDraftType = "Income" | "Expense";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function entriesHref(query: ListEntriesInput): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.entry_type !== "all") {
    params.set("entry_type", query.entry_type);
  }
  if (query.account_id) {
    params.set("account_id", query.account_id);
  }
  if (query.category_id) {
    params.set("category_id", query.category_id);
  }
  if (query.date_from) {
    params.set("date_from", query.date_from);
  }
  if (query.date_to) {
    params.set("date_to", query.date_to);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  const qs = params.toString();
  return qs ? `/accounting/entries?${qs}` : "/accounting/entries";
}

function exportHref(query: ListEntriesInput): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.entry_type !== "all") {
    params.set("entry_type", query.entry_type);
  }
  if (query.account_id) {
    params.set("account_id", query.account_id);
  }
  if (query.category_id) {
    params.set("category_id", query.category_id);
  }
  if (query.date_from) {
    params.set("date_from", query.date_from);
  }
  if (query.date_to) {
    params.set("date_to", query.date_to);
  }
  const qs = params.toString();
  return qs ? `/api/export/entries?${qs}` : "/api/export/entries";
}

export function EntriesView({
  query,
  result,
  accounts,
  categories,
  parties,
  employees,
}: EntriesViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createType, setCreateType] = useState<EntryDraftType | null>(null);
  const [editEntry, setEditEntry] = useState<EntryListRecord | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<EntryListRecord | null>(null);
  const [allocateEntry, setAllocateEntry] = useState<EntryListRecord | null>(null);
  const [invoices, setInvoices] = useState<OutstandingInvoiceOption[]>([]);
  const [allocRows, setAllocRows] = useState<Array<{ invoice_id: string; amount: string }>>([
    { invoice_id: "", amount: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<EntryDraftType>("Income");

  const pushQuery = (next: ListEntriesInput) => {
    push(entriesHref(next));
  };

  const filteredEmpty =
    Boolean(query.search) ||
    query.entry_type !== "all" ||
    Boolean(query.account_id) ||
    Boolean(query.category_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  const activeAccounts = accounts.filter((row) => row.is_active);
  const activeParties = parties.filter((row) => row.is_active);
  const activeEmployees = employees.filter((row) => row.is_active);
  const categoriesForType = useMemo(
    () => categories.filter((row) => row.type === draftType && row.is_active),
    [categories, draftType],
  );

  function runMutation(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setFormError(null);
    startTransition(async () => {
      const outcome = await action();
      if (!outcome.ok) {
        setFormError(outcome.error?.message ?? "Unable to save.");
        toast.error(outcome.error?.message ?? "Unable to save.");
        return;
      }
      setCreateType(null);
      setEditEntry(null);
      setDeleteEntry(null);
      setAllocateEntry(null);
      toast.success(success);
      router.refresh();
    });
  }

  function openCreate(type: EntryDraftType) {
    setFormError(null);
    setDraftType(type);
    setCreateType(type);
  }

  function openAllocate(row: EntryListRecord) {
    setFormError(null);
    setAllocateEntry(row);
    setAllocRows([{ invoice_id: "", amount: "" }]);
    startTransition(async () => {
      const outcome = await listOutstandingInvoicesAction();
      if (!outcome.ok) {
        toast.error(outcome.error?.message ?? "Unable to load invoices.");
        return;
      }
      setInvoices(outcome.data);
    });
  }

  const previewUsed = allocRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const previewRemaining = allocateEntry
    ? Math.round((allocateEntry.remaining - previewUsed) * 100) / 100
    : 0;

  return (
    <>
      <FilterBar
        action={
          <>
            <a className="ui-button ui-button-secondary" href={exportHref(query)}>
              Export
            </a>
            <AddButton
              onClick={() => {
                openCreate("Income");
              }}
            >
              Add Income
            </AddButton>
            <AddButton
              variant="secondary"
              onClick={() => {
                openCreate("Expense");
              }}
            >
              Add Expense
            </AddButton>
          </>
        }
        onReset={() =>
          pushQuery({
            search: "",
            entry_type: "all",
            account_id: undefined,
            category_id: undefined,
            party_id: undefined,
            employee_id: undefined,
            date_from: undefined,
            date_to: undefined,
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search remarks"
        />
        <FormField label="Entry Type" htmlFor="entry-type-filter">
          <Select
            id="entry-type-filter"
            value={query.entry_type}
            onChange={(event) =>
              pushQuery({
                ...query,
                entry_type: event.target.value as ListEntriesInput["entry_type"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </Select>
        </FormField>
        <FormField label="Account" htmlFor="entry-account-filter">
          <Select
            id="entry-account-filter"
            value={query.account_id ?? ""}
            onChange={(event) =>
              pushQuery({ ...query, account_id: event.target.value || undefined, page: 1 })
            }
          >
            <option value="">All</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Category" htmlFor="entry-category-filter">
          <Select
            id="entry-category-filter"
            value={query.category_id ?? ""}
            onChange={(event) =>
              pushQuery({ ...query, category_id: event.target.value || undefined, page: 1 })
            }
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.type})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date From" htmlFor="entry-date-from">
          <DatePicker
            id="entry-date-from"
            value={query.date_from ?? ""}
            onChange={(event) =>
              pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })
            }
          />
        </FormField>
        <FormField label="Date To" htmlFor="entry-date-to">
          <DatePicker
            id="entry-date-to"
            value={query.date_to ?? ""}
            onChange={(event) =>
              pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })
            }
          />
        </FormField>
      </FilterBar>

      {queryPending ? (
        <SummaryGridSkeleton count={4} />
      ) : (
        <dl className="ui-summary-grid">
          <div className="ui-detail-item">
            <dt>Total Income</dt>
            <dd className="ui-amount-income">{formatInr(result.summary.total_income)}</dd>
          </div>
          <div className="ui-detail-item">
            <dt>Total Expense</dt>
            <dd className="ui-amount-expense">{formatInr(result.summary.total_expense)}</dd>
          </div>
          <div className="ui-detail-item">
            <dt>Net Amount</dt>
            <dd className={result.summary.net < 0 ? "ui-amount-expense" : "ui-amount-income"}>
              {formatInr(result.summary.net)}
            </dd>
          </div>
          <div className="ui-detail-item">
            <dt>Total Entry Count</dt>
            <dd>{result.summary.count}</dd>
          </div>
        </dl>
      )}
      <p className="sr-only">Net Amount is Total Income minus Total Expense</p>

      <DataTable
        caption="Entries"
        columns={[
          { key: "date", header: "Date", render: (row) => formatDisplayDate(row.entry_date) },
          {
            key: "type",
            header: "Type",
            render: (row) => <StatusBadge tone={row.entry_type === "Income" ? "income" : "expense"} />,
          },
          { key: "account", header: "Account", render: (row) => row.account_name },
          { key: "category", header: "Category", render: (row) => row.category_name },
          { key: "party", header: "Party", render: (row) => row.party_name ?? "—" },
          { key: "employee", header: "Employee", render: (row) => row.employee_name ?? "—" },
          {
            key: "amount",
            header: "Amount",
            numeric: true,
            render: (row) => (
              <span className={row.entry_type === "Income" ? "ui-amount-income" : "ui-amount-expense"}>
                {row.entry_type === "Expense" ? `−${formatInr(row.amount)}` : formatInr(row.amount)}
              </span>
            ),
          },
          { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "—" },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <TableActions>
                <IconButton
                  tone="edit"
                  label="Edit entry"
                  onClick={() => {
                    setFormError(null);
                    setDraftType(row.entry_type);
                    setEditEntry(row);
                  }}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                {row.entry_type === "Income" && row.remaining > 0 ? (
                  <IconButton tone="allocate" label="Allocate entry" onClick={() => openAllocate(row)}>
                    <AllocateIcon width={16} height={16} />
                  </IconButton>
                ) : null}
                {row.allocated === 0 ? (
                  <IconButton tone="delete" label="Delete entry" onClick={() => setDeleteEntry(row)}>
                    <DeleteIcon width={16} height={16} />
                  </IconButton>
                ) : null}
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setFormError(null);
          setDraftType(row.entry_type);
          setEditEntry(row);
        }}
        loading={queryPending}
        emptyTitle={filteredEmpty ? "No entries match the selected filters." : "No entries found."}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        disabled={queryPending}
        onPageChange={(page) => pushQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
      />

      <Dialog
        open={createType !== null}
        title={createType === "Expense" ? "Add Expense" : "Add Income"}
        onClose={() => setCreateType(null)}
        disableClose={pending}
        footer={null}
      >
        {createType ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  createEntryAction({
                    entry_type: createType,
                    account_id: String(form.get("account_id") ?? ""),
                    category_id: String(form.get("category_id") ?? ""),
                    party_id: String(form.get("party_id") ?? ""),
                    employee_id: String(form.get("employee_id") ?? ""),
                    entry_date: String(form.get("entry_date") ?? ""),
                    amount: String(form.get("amount") ?? ""),
                    remarks: String(form.get("remarks") ?? ""),
                  }),
                createType === "Income" ? "Income entry created successfully." : "Expense entry created successfully.",
              );
            }}
          >
            <FormField label="Entry Type" htmlFor="create-entry-type" required>
              <Input id="create-entry-type" value={createType} readOnly disabled placeholder="Income or Expense" />
            </FormField>
            <FormField label="Account" htmlFor="create-account" required>
              <Select id="create-account" name="account_id" required disabled={pending}>
                <option value="">Select account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="create-category" required>
              <Select id="create-category" name="category_id" required disabled={pending}>
                <option value="">Select category</option>
                {categoriesForType.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Party" htmlFor="create-party">
              <Select id="create-party" name="party_id" disabled={pending}>
                <option value="">None</option>
                {activeParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.company_name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Employee"
              htmlFor="create-employee"
              help={createType === "Expense" ? "Salary payments use an Expense entry with an employee." : undefined}
            >
              <Select id="create-employee" name="employee_id" disabled={pending}>
                <option value="">None</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Entry Date" htmlFor="create-date" required>
              <DatePicker
                id="create-date"
                name="entry_date"
                required
                defaultValue={todayIso()}
                disabled={pending}
              />
            </FormField>
            <FormField label="Amount" htmlFor="create-amount" required>
              <Input id="create-amount" name="amount" inputMode="decimal" required disabled={pending} placeholder="e.g. 1000.00" />
            </FormField>
            <FormField label="Remarks" htmlFor="create-remarks">
              <Textarea id="create-remarks" name="remarks" disabled={pending} placeholder="Optional note" />
            </FormField>
            {formError && createType ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setCreateType(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(editEntry)}
        title="Edit Entry"
        onClose={() => setEditEntry(null)}
        disableClose={pending}
        footer={null}
      >
        {editEntry ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateEntryAction({
                    id: editEntry.id,
                    entry_type: draftType,
                    account_id: String(form.get("account_id") ?? ""),
                    category_id: String(form.get("category_id") ?? ""),
                    party_id: String(form.get("party_id") ?? ""),
                    employee_id: String(form.get("employee_id") ?? ""),
                    entry_date: String(form.get("entry_date") ?? ""),
                    amount: String(form.get("amount") || editEntry.amount),
                    remarks: String(form.get("remarks") ?? ""),
                  }),
                "Entry updated successfully.",
              );
            }}
          >
            <FormField
              label="Entry Type"
              htmlFor="edit-entry-type"
              required
              help={
                editEntry.allocated > 0
                  ? "Amount and type cannot be changed while allocations exist."
                  : undefined
              }
            >
              <Select
                id="edit-entry-type"
                value={draftType}
                disabled={pending || editEntry.allocated > 0}
                onChange={(event) => setDraftType(event.target.value as EntryDraftType)}
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </Select>
            </FormField>
            <FormField label="Account" htmlFor="edit-account" required>
              <Select
                id="edit-account"
                name="account_id"
                required
                defaultValue={editEntry.account_id}
                disabled={pending}
              >
                {[editEntry.account_id, ...activeAccounts.map((row) => row.id)]
                  .filter((id, index, all) => all.indexOf(id) === index)
                  .map((id) => {
                    const account = accounts.find((row) => row.id === id);
                    return (
                      <option key={id} value={id}>
                        {account?.name ?? editEntry.account_name}
                      </option>
                    );
                  })}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="edit-category" required>
              <Select id="edit-category" name="category_id" required disabled={pending} defaultValue={editEntry.category_id}>
                <option value="">Select category</option>
                {categories
                  .filter(
                    (category) =>
                      category.type === draftType &&
                      (category.is_active || category.id === editEntry.category_id),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Party" htmlFor="edit-party">
              <Select id="edit-party" name="party_id" defaultValue={editEntry.party_id ?? ""} disabled={pending}>
                <option value="">None</option>
                {parties
                  .filter((party) => party.is_active || party.id === editEntry.party_id)
                  .map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.company_name}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Employee" htmlFor="edit-employee">
              <Select
                id="edit-employee"
                name="employee_id"
                defaultValue={editEntry.employee_id ?? ""}
                disabled={pending}
              >
                <option value="">None</option>
                {employees
                  .filter((employee) => employee.is_active || employee.id === editEntry.employee_id)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Entry Date" htmlFor="edit-date" required>
              <DatePicker
                id="edit-date"
                name="entry_date"
                required
                defaultValue={editEntry.entry_date}
                disabled={pending}
              />
            </FormField>
            <FormField label="Amount" htmlFor="edit-amount" required>
              <Input
                id="edit-amount"
                name="amount"
                inputMode="decimal"
                required
                defaultValue={Number(editEntry.amount).toFixed(2)}
                disabled={pending}
                readOnly={editEntry.allocated > 0}
                placeholder="e.g. 1000.00"
              />
            </FormField>
            <FormField label="Remarks" htmlFor="edit-remarks">
              <Textarea id="edit-remarks" name="remarks" defaultValue={editEntry.remarks ?? ""} disabled={pending} placeholder="Optional note" />
            </FormField>
            {formError && editEntry ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(allocateEntry)}
        title="Allocate Income"
        onClose={() => setAllocateEntry(null)}
        disableClose={pending}
        footer={null}
      >
        {allocateEntry ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const items = allocRows.filter((row) => row.invoice_id && row.amount);
              runMutation(
                () =>
                  allocateEntryAction({
                    entry_id: allocateEntry.id,
                    items,
                  }),
                "Allocation saved successfully.",
              );
            }}
          >
            <p className="ui-field-help">
              Entry amount {formatInr(allocateEntry.amount)}. Remaining {formatInr(allocateEntry.remaining)}.
              Preview remaining after this form: {formatInr(previewRemaining)}. Server remaining is final.
            </p>
            {allocRows.map((row, index) => (
              <div key={`${row.invoice_id}-${index}`} className="ui-pagination-controls">
                <FormField label="Invoice" htmlFor={`alloc-invoice-${index}`} required>
                  <Select
                    id={`alloc-invoice-${index}`}
                    value={row.invoice_id}
                    disabled={pending}
                    onChange={(event) => {
                      const next = [...allocRows];
                      next[index] = { ...row, invoice_id: event.target.value };
                      setAllocRows(next);
                    }}
                  >
                    <option value="">Select invoice</option>
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} · {invoice.lot_number} · outstanding{" "}
                        {formatInr(invoice.outstanding)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Allocation Amount" htmlFor={`alloc-amount-${index}`} required>
                  <Input
                    id={`alloc-amount-${index}`}
                    inputMode="decimal"
                    value={row.amount}
                    disabled={pending}
                    placeholder="e.g. 500.00"
                    onChange={(event) => {
                      const next = [...allocRows];
                      next[index] = { ...row, amount: event.target.value };
                      setAllocRows(next);
                    }}
                  />
                </FormField>
                {allocRows.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() => setAllocRows(allocRows.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => setAllocRows([...allocRows, { invoice_id: "", amount: "" }])}
            >
              Add invoice
            </Button>
            {formError && allocateEntry ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setAllocateEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={previewRemaining < 0}>
                Allocate
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteEntry)}
        title="Delete Entry?"
        description={
          deleteEntry
            ? "This entry will be permanently deleted. Entries with invoice allocations cannot be deleted."
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteEntry(null)}
        onConfirm={() => {
          if (!deleteEntry) {
            return;
          }
          runMutation(() => deleteEntryAction({ id: deleteEntry.id }), "Entry deleted successfully.");
        }}
      />
    </>
  );
}
