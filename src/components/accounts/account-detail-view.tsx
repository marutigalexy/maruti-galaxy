"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAccountAction, updateAccountAction } from "@/app/actions/accounts";
import { deleteEntryAction } from "@/app/actions/entries";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import type { Paginated } from "@/lib/api/pagination";
import { queryHref } from "@/lib/api/query-href";
import { formatDisplayDate, formatSignedInr, signedAmountType } from "@/lib/formatters";
import { signedDecimalOnly } from "@/lib/ui/input-filters";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { AccountRecord } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EntryListRecord } from "@/services/entries/entries-service";

type AccountDetailViewProps = {
  account: AccountRecord;
  query: ListEntriesInput;
  entries: Paginated<EntryListRecord>;
  categories: CategoryOption[];
};

function accountEntriesHref(accountId: string, query: ListEntriesInput): string {
  return queryHref(`/accounting/accounts/${accountId}`, {
    entry_type: query.entry_type,
    category_id: query.category_id,
    date_from: query.date_from,
    date_to: query.date_to,
    sort: query.sort === "date" ? undefined : query.sort,
    dir: query.dir === "desc" ? undefined : query.dir,
    page: query.page,
  });
}

function nextSort(query: ListEntriesInput, key: string): ListEntriesInput {
  const sort = key as ListEntriesInput["sort"];
  const dir = query.sort === sort && query.dir === "desc" ? "asc" : "desc";
  return { ...query, sort, dir, page: 1 };
}

function SignedInr({ amount, type }: { amount: number; type?: "Income" | "Expense" }) {
  const resolved = type ?? signedAmountType(amount);
  return (
    <span className={resolved === "Income" ? "ui-amount-income" : "ui-amount-expense"}>
      {formatSignedInr(resolved, amount)}
    </span>
  );
}

export function AccountDetailView({ account, query, entries, categories }: AccountDetailViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<AccountRecord | null>(null);
  const [cannotDeleteAccount, setCannotDeleteAccount] = useState<AccountRecord | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<EntryListRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useRecordTitle(account.name);
  const pushQuery = (next: ListEntriesInput) => {
    push(accountEntriesHref(account.id, next));
  };
  const filtered =
    query.entry_type !== "all" ||
    Boolean(query.category_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={account.is_active ? "active" : "inactive"} />
      </TopbarStatus>
      <TopbarActions>
        <IconButton
          tone="delete"
          label="Delete account"
          onClick={() => {
            if (account.entry_count > 0) {
              setCannotDeleteAccount(account);
            } else {
              setDeleteAccountTarget(account);
            }
          }}
        >
          <DeleteIcon width={16} height={16} />
        </IconButton>
        <IconButton tone="edit" label="Edit account" onClick={() => setEditOpen(true)}>
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>
      <div className="ui-detail-stack">
        <section className="ui-section" aria-label="Account summary">
          <div className="ui-kpi-grid">
            <article className="ui-kpi-card">
              <p className="ui-kpi-label">Opening Balance</p>
              <p className="ui-kpi-value">
                <SignedInr amount={account.opening_balance} />
              </p>
            </article>
            <article className="ui-kpi-card">
              <p className="ui-kpi-label">Total In</p>
              <p className="ui-kpi-value">
                <SignedInr amount={account.total_in} type="Income" />
              </p>
            </article>
            <article className="ui-kpi-card">
              <p className="ui-kpi-label">Total Out</p>
              <p className="ui-kpi-value">
                <SignedInr amount={account.total_out} type="Expense" />
              </p>
            </article>
            <article className="ui-kpi-card">
              <p className="ui-kpi-label">Current Balance</p>
              <p className="ui-kpi-value">
                <SignedInr amount={account.current_balance} />
              </p>
              <p className="ui-kpi-help">Opening + Total In − Total Out</p>
            </article>
            <article className="ui-kpi-card">
              <p className="ui-kpi-label">Total Entry Count</p>
              <p className="ui-kpi-value">{account.entry_count}</p>
            </article>
          </div>
        </section>
        <Card title="Related Entries">
          <FilterBar
            onReset={() =>
              pushQuery({
                search: "",
                entry_type: "all",
                account_id: account.id,
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
            <FormField label="Entry Type" htmlFor="account-entry-type">
              <Select
                id="account-entry-type"
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
            <FormField label="Category" htmlFor="account-entry-category">
              <Select
                id="account-entry-category"
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
            <FormField label="Date From" htmlFor="account-date-from">
              <DatePicker
                id="account-date-from"
                value={query.date_from ?? ""}
                onChange={(event) =>
                  pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })
                }
              />
            </FormField>
            <FormField label="Date To" htmlFor="account-date-to">
              <DatePicker
                id="account-date-to"
                value={query.date_to ?? ""}
                onChange={(event) =>
                  pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })
                }
              />
            </FormField>
          </FilterBar>
          <DataTable
            caption="Related entries"
            columns={[
              { key: "date", header: "Date", sortKey: "date", render: (row) => formatDisplayDate(row.entry_date) },
              {
                key: "type",
                header: "Type",
                sortKey: "type",
                render: (row) => <StatusBadge tone={row.entry_type === "Income" ? "income" : "expense"} />,
              },
              { key: "category", header: "Category", render: (row) => row.category_name },
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
                  <IconButton
                    tone="delete"
                    label="Delete entry"
                    disabled={pending}
                    onClick={() => setDeleteEntryTarget(row)}
                  >
                    <DeleteIcon width={16} height={16} />
                  </IconButton>
                ),
              },
            ]}
            rows={entries.records}
            rowKey={(row) => row.id}
            sort={query.sort}
            sortDir={query.dir}
            onSort={(key) => pushQuery(nextSort(query, key))}
            loading={queryPending}
            emptyTitle={filtered ? "No entries match the selected filters." : "No entries yet."}
            footer={
              <Pagination
                page={entries.page}
                pageSize={entries.pageSize}
                totalCount={entries.totalCount}
                disabled={queryPending}
                onPageChange={(page) => pushQuery({ ...query, page })}
              />
            }
          />
        </Card>
      </div>
      <Dialog
        open={editOpen}
        title="Edit Account"
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
              const outcome = await updateAccountAction({
                id: account.id,
                name: String(form.get("name") ?? ""),
                opening_balance: String(form.get("opening_balance") ?? ""),
              });
              if (!outcome.ok) {
                setFormError(outcome.error.message);
                toast.error(outcome.error.message);
                return;
              }
              setEditOpen(false);
              toast.success("Account updated successfully.");
              router.refresh();
            });
          }}
        >
          <FormField label="Account Name" htmlFor="detail-edit-account-name" required>
            <Input
              id="detail-edit-account-name"
              name="name"
              required
              maxLength={200}
              defaultValue={account.name}
              disabled={pending}
              placeholder="e.g. HDFC Current"
            />
          </FormField>
          <FormField
            label="Opening Balance"
            htmlFor="detail-edit-opening"
            required
            help={
              account.entry_count > 0
                ? "Opening balance cannot be changed after entries exist."
                : undefined
            }
          >
            <Input
              id="detail-edit-opening"
              name={account.entry_count > 0 ? undefined : "opening_balance"}
              inputMode="decimal"
              required={account.entry_count === 0}
              defaultValue={String(account.opening_balance)}
              disabled={pending || account.entry_count > 0}
              readOnly={account.entry_count > 0}
              placeholder="e.g. 0.00"
              onInput={(e) => {
                e.currentTarget.value = signedDecimalOnly(e.currentTarget.value, 2);
              }}
            />
            {account.entry_count > 0 ? (
              <input type="hidden" name="opening_balance" value={String(account.opening_balance)} />
            ) : null}
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

      <Dialog
        open={Boolean(cannotDeleteAccount)}
        title="Cannot Delete Account"
        onClose={() => setCannotDeleteAccount(null)}
        disableClose={pending}
        footer={
          <div className="ui-dialog-actions">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => setCannotDeleteAccount(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {cannotDeleteAccount ? (
          <div className="ui-account-blocked-dialog">
            <p>
              <strong>{cannotDeleteAccount.name}</strong> cannot be deleted because it has{" "}
              <strong>{cannotDeleteAccount.entry_count} transaction records</strong> linked to it.
            </p>
            <div className="ui-account-blocked-summary">
              <p><strong>Total In:</strong> {formatSignedInr("Income", cannotDeleteAccount.total_in)}</p>
              <p><strong>Total Out:</strong> {formatSignedInr("Expense", cannotDeleteAccount.total_out)}</p>
              <p><strong>Current Balance:</strong> {formatSignedInr(cannotDeleteAccount.current_balance >= 0 ? "Income" : "Expense", Math.abs(cannotDeleteAccount.current_balance))}</p>
            </div>
            <p className="ui-account-blocked-note">
              Deleting an account with existing transactions would cause accounting discrepancies and orphaned ledger entries. To remove this account, delete its linked entries first, or deactivate the account instead.
            </p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteAccountTarget)}
        title="Delete Account?"
        description={
          deleteAccountTarget
            ? `Are you sure you want to permanently delete "${deleteAccountTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteAccountTarget(null)}
        onConfirm={() => {
          if (!deleteAccountTarget) return;
          startTransition(async () => {
            const outcome = await deleteAccountAction({ id: deleteAccountTarget.id });
            if (!outcome.ok) {
              toast.error(outcome.error.message);
              return;
            }
            setDeleteAccountTarget(null);
            toast.success("Account deleted successfully.");
            router.push("/accounting/accounts");
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="Delete Entry?"
        description={
          deleteEntryTarget
            ? `Are you sure you want to delete this ${deleteEntryTarget.entry_type.toLowerCase()} entry of ${formatSignedInr(deleteEntryTarget.entry_type, deleteEntryTarget.amount)}? Any linked invoice allocations and account balances will be automatically recalculated.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteEntryTarget(null)}
        onConfirm={() => {
          if (!deleteEntryTarget) return;
          startTransition(async () => {
            const outcome = await deleteEntryAction({ id: deleteEntryTarget.id });
            if (!outcome.ok) {
              toast.error(outcome.error.message);
              return;
            }
            setDeleteEntryTarget(null);
            toast.success("Entry deleted successfully.");
            router.refresh();
          });
        }}
      />
    </>
  );
}
