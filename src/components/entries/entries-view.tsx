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
import { FinancialKpiCards } from "@/components/reports/financial-kpi-cards";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { AllocateIcon, DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import { queryHref } from "@/lib/api/query-href";
import { formatDisplayDate, formatInr, formatSignedInr } from "@/lib/formatters";
import { decimalOnly } from "@/lib/ui/input-filters";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { OutstandingInvoiceOption } from "@/services/allocations/allocations-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EntryListRecord, EntrySummary } from "@/services/entries/entries-service";

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
};

type EntryDraftType = "Income" | "Expense";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function entriesHref(query: ListEntriesInput): string {
  return queryHref("/accounting/entries", {
    search: query.search,
    entry_type: query.entry_type,
    account_id: query.account_id,
    category_id: query.category_id,
    date_from: query.date_from,
    date_to: query.date_to,
    sort: query.sort === "date" ? undefined : query.sort,
    dir: query.dir === "desc" ? undefined : query.dir,
    page: query.page,
  });
}

function exportHref(query: ListEntriesInput): string {
  return queryHref("/api/export/entries", {
    search: query.search,
    entry_type: query.entry_type,
    account_id: query.account_id,
    category_id: query.category_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });
}

function nextSort(query: ListEntriesInput, key: string): ListEntriesInput {
  const sort = key as ListEntriesInput["sort"];
  const dir = query.sort === sort && query.dir === "desc" ? "asc" : "desc";
  return { ...query, sort, dir, page: 1 };
}

type EntryTypeToggleProps = {
  id?: string;
  value: EntryDraftType;
  disabled?: boolean;
  onChange: (type: EntryDraftType) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function EntryTypeToggle({
  id,
  value,
  disabled,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: EntryTypeToggleProps) {
  return (
    <div
      id={id}
      className="ui-type-toggle"
      role="radiogroup"
      aria-label="Entry Type"
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    >
      <button
        type="button"
        className={["ui-type-toggle-btn", value === "Expense" ? "is-expense" : ""].filter(Boolean).join(" ")}
        role="radio"
        aria-checked={value === "Expense"}
        disabled={disabled}
        onClick={() => onChange("Expense")}
      >
        Expense
      </button>
      <button
        type="button"
        className={["ui-type-toggle-btn", value === "Income" ? "is-income" : ""].filter(Boolean).join(" ")}
        role="radio"
        aria-checked={value === "Income"}
        disabled={disabled}
        onClick={() => onChange("Income")}
      >
        Income
      </button>
    </div>
  );
}

export function EntriesView({
  query,
  result,
  accounts,
  categories,
}: EntriesViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
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
      setCreateOpen(false);
      setEditEntry(null);
      setDeleteEntry(null);
      setAllocateEntry(null);
      toast.success(success);
      router.refresh();
    });
  }

  function openCreate() {
    setFormError(null);
    setDraftType("Income");
    setCreateOpen(true);
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
            <ExportButton href={exportHref(query)} />
            <AddButton onClick={openCreate}>Add Entry</AddButton>
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
            sort: "date",
            dir: "desc",
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

      <FinancialKpiCards
        totalIncome={result.summary.total_income}
        totalExpense={result.summary.total_expense}
        net={result.summary.net}
        totalEntries={result.summary.count}
        loading={queryPending}
        netLabel="Net Amount"
      />
      <p className="sr-only">Net Amount is Total Income minus Total Expense</p>

      <DataTable
        caption="Entries"
        columns={[
          { key: "date", header: "Date", sortKey: "date", render: (row) => formatDisplayDate(row.entry_date) },
          {
            key: "type",
            header: "Type",
            sortKey: "type",
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
            sortKey: "amount",
            render: (row) => (
              <span className={row.entry_type === "Income" ? "ui-amount-income" : "ui-amount-expense"}>
                {formatSignedInr(row.entry_type, row.amount)}
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
                <IconButton tone="delete" label="Delete entry" onClick={() => setDeleteEntry(row)}>
                  <DeleteIcon width={16} height={16} />
                </IconButton>
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        sort={query.sort}
        sortDir={query.dir}
        onSort={(key) => pushQuery(nextSort(query, key))}
        onRowClick={(row) => {
          setFormError(null);
          setDraftType(row.entry_type);
          setEditEntry(row);
        }}
        loading={queryPending}
        emptyTitle={filteredEmpty ? "No entries match the selected filters." : "No entries found."}
        footer={
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            disabled={queryPending}
            onPageChange={(page) => pushQuery({ ...query, page })}
          />
        }
      />

      <Dialog
        open={createOpen}
        title="Add New Entry"
        onClose={() => setCreateOpen(false)}
        disableClose={pending}
        footer={null}
      >
        {createOpen ? (
          <form
            className="ui-dialog-form ui-entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  createEntryAction({
                    entry_type: draftType,
                    account_id: String(form.get("account_id") ?? ""),
                    category_id: String(form.get("category_id") ?? ""),
                    party_id: "",
                    employee_id: "",
                    entry_date: String(form.get("entry_date") ?? ""),
                    amount: String(form.get("amount") ?? ""),
                    remarks: String(form.get("remarks") ?? ""),
                  }),
                draftType === "Income" ? "Income entry created successfully." : "Expense entry created successfully.",
              );
            }}
          >
            <FormField label="Entry Type" htmlFor="create-entry-type" required className="ui-entry-span">
              <EntryTypeToggle
                value={draftType}
                disabled={pending}
                onChange={(type) => {
                  setDraftType(type);
                  setFormError(null);
                }}
              />
            </FormField>
            <FormField label="Payment Account" htmlFor="create-account" required>
              <Select id="create-account" name="account_id" required disabled={pending}>
                <option value="">Select account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={`${draftType} Category`} htmlFor="create-category" required>
              <Select
                key={draftType}
                id="create-category"
                name="category_id"
                required
                disabled={pending}
              >
                <option value="">Select {draftType.toLowerCase()} category</option>
                {categoriesForType.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Entry Date" htmlFor="create-date" required className="ui-entry-span">
              <DatePicker
                id="create-date"
                name="entry_date"
                required
                defaultValue={todayIso()}
                disabled={pending}
              />
            </FormField>
            <FormField label="Amount" htmlFor="create-amount" required className="ui-entry-span">
              <Input
                id="create-amount"
                name="amount"
                inputMode="decimal"
                required
                defaultValue="0.00"
                disabled={pending}
                placeholder="0.00"
                onInput={(e) => {
                  e.currentTarget.value = decimalOnly(e.currentTarget.value, 2);
                }}
              />
            </FormField>
            <FormField label="Remarks" htmlFor="create-remarks" className="ui-entry-span">
              <Textarea
                id="create-remarks"
                name="remarks"
                maxLength={100}
                disabled={pending}
                placeholder="Add notes for this entry (optional)"
              />
            </FormField>
            {formError && createOpen ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="ghost" disabled={pending} onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save Entry
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
            className="ui-dialog-form ui-entry-form"
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
                    party_id: editEntry.party_id ?? "",
                    employee_id: editEntry.employee_id ?? "",
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
              className="ui-entry-span"
              help={
                editEntry.allocated > 0
                  ? "Amount and type cannot be changed while allocations exist."
                  : undefined
              }
            >
              <EntryTypeToggle
                value={draftType}
                disabled={pending || editEntry.allocated > 0}
                onChange={(type) => {
                  setDraftType(type);
                  setFormError(null);
                }}
              />
            </FormField>
            <FormField label="Payment Account" htmlFor="edit-account" required>
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
            <FormField label={`${draftType} Category`} htmlFor="edit-category" required>
              <Select
                key={`${editEntry.id}-${draftType}`}
                id="edit-category"
                name="category_id"
                required
                disabled={pending}
                defaultValue={draftType === editEntry.entry_type ? editEntry.category_id : ""}
              >
                <option value="">Select {draftType.toLowerCase()} category</option>
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
            <FormField label="Entry Date" htmlFor="edit-date" required className="ui-entry-span">
              <DatePicker
                id="edit-date"
                name="entry_date"
                required
                defaultValue={editEntry.entry_date}
                disabled={pending}
              />
            </FormField>
            <FormField label="Amount" htmlFor="edit-amount" required className="ui-entry-span">
              <Input
                id="edit-amount"
                name="amount"
                inputMode="decimal"
                required
                defaultValue={Number(editEntry.amount).toFixed(2)}
                disabled={pending}
                readOnly={editEntry.allocated > 0}
                placeholder="0.00"
                onInput={(e) => {
                  e.currentTarget.value = decimalOnly(e.currentTarget.value, 2);
                }}
              />
            </FormField>
            <FormField label="Remarks" htmlFor="edit-remarks" className="ui-entry-span">
              <Textarea
                id="edit-remarks"
                name="remarks"
                maxLength={100}
                defaultValue={editEntry.remarks ?? ""}
                disabled={pending}
                placeholder="Add notes for this entry (optional)"
              />
            </FormField>
            {formError && editEntry ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button
                variant="danger"
                type="button"
                disabled={pending}
                onClick={() => {
                  const toDel = editEntry;
                  setEditEntry(null);
                  setDeleteEntry(toDel);
                }}
              >
                Delete
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setEditEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* Allocate Entry Dialog */}
      <Dialog
        open={Boolean(allocateEntry)}
        title={
          allocateEntry
            ? `Allocate Entry #${allocateEntry.id.slice(0, 8)} · ${allocateEntry.party_name ?? "Party"}`
            : "Allocate Entry"
        }
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
                      next[index] = { ...row, amount: decimalOnly(event.target.value, 2) };
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
            ? `Are you sure you want to delete this ${deleteEntry.entry_type.toLowerCase()} entry of ${formatInr(deleteEntry.amount)}? Any linked invoice allocations and account balances will be automatically recalculated and adjusted.`
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
