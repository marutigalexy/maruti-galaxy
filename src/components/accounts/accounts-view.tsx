"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createAccountAction,
  deleteAccountAction,
  setAccountActiveAction,
  updateAccountAction,
} from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon, PowerIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import { listHref } from "@/lib/api/list-href";
import type { Paginated } from "@/lib/api/pagination";
import { queryHref } from "@/lib/api/query-href";
import { formatSignedInr, signedAmountType } from "@/lib/formatters";
import { signedDecimalOnly } from "@/lib/ui/input-filters";
import type { ListAccountsInput } from "@/lib/validation/accounts";
import type { AccountRecord } from "@/services/accounts/accounts-service";

type AccountsViewProps = {
  query: ListAccountsInput;
  result: Paginated<AccountRecord>;
};

function SignedInr({ amount, type }: { amount: number; type?: "Income" | "Expense" }) {
  const resolved = type ?? signedAmountType(amount);
  return (
    <span className={resolved === "Income" ? "ui-amount-income" : "ui-amount-expense"}>
      {formatSignedInr(resolved, amount)}
    </span>
  );
}

export function AccountsView({ query, result }: AccountsViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountRecord | null>(null);
  const [deactivateAccount, setDeactivateAccount] = useState<AccountRecord | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<AccountRecord | null>(null);
  const [cannotDeleteAccount, setCannotDeleteAccount] = useState<AccountRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListAccountsInput) => {
    push(listHref("/accounting/accounts", next));
  };

  function handleOpenCreate() {
    setFormError(null);
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setFormError(null);
    setCreateOpen(false);
  }

  function handleOpenEdit(acc: AccountRecord) {
    setFormError(null);
    setEditAccount(acc);
  }

  function handleCloseEdit() {
    setFormError(null);
    setEditAccount(null);
  }

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
      setEditAccount(null);
      setDeactivateAccount(null);
      setDeleteAccount(null);
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <>
      <FilterBar
        action={
          <>
            <ExportButton href={queryHref("/api/export/accounts", { search: query.search, status: query.status })} />
            <AddButton onClick={handleOpenCreate}>
              Add Account
            </AddButton>
          </>
        }
        onReset={() => pushQuery({ search: "", status: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) =>
            pushQuery({ ...query, search, page: 1 })
          }
          placeholder="Search account name"
        />
        <FormField label="Status" htmlFor="account-status">
          <Select
            id="account-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({
                ...query,
                status: event.target.value as ListAccountsInput["status"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        caption="Accounts"
        columns={[
          { key: "name", header: "Account Name", render: (row) => row.name },
          {
            key: "opening",
            header: "Opening Balance",
            numeric: true,
            render: (row) => <SignedInr amount={row.opening_balance} />,
          },
          { key: "in", header: "Total In", numeric: true, render: (row) => <SignedInr amount={row.total_in} type="Income" /> },
          { key: "out", header: "Total Out", numeric: true, render: (row) => <SignedInr amount={row.total_out} type="Expense" /> },
          {
            key: "balance",
            header: "Current Balance",
            numeric: true,
            render: (row) => <SignedInr amount={row.current_balance} />,
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge tone={row.is_active ? "active" : "inactive"} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <TableActions>
                <IconButton
                  tone="edit"
                  label="Edit account"
                  onClick={() => handleOpenEdit(row)}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                {row.is_active ? (
                  <IconButton tone="deactivate" label="Deactivate account" onClick={() => setDeactivateAccount(row)}>
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    tone="activate"
                    label="Activate account"
                    onClick={() =>
                      runMutation(
                        () => setAccountActiveAction({ id: row.id, is_active: true }),
                        "Account activated successfully.",
                      )
                    }
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                )}
                <IconButton
                  tone="delete"
                  label="Delete account"
                  onClick={() => {
                    if (row.entry_count > 0) {
                      setCannotDeleteAccount(row);
                    } else {
                      setDeleteAccount(row);
                    }
                  }}
                >
                  <DeleteIcon width={16} height={16} />
                </IconButton>
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/accounting/accounts/${row.id}`)}
        loading={queryPending}
        emptyTitle={
          query.search || query.status !== "all"
            ? "No accounts match the selected filters."
            : "No accounts found."
        }
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
        title="Add Account"
        onClose={handleCloseCreate}
        disableClose={pending}
        footer={null}
      >
        {createOpen ? (
          <form
            key="create-account-form"
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  createAccountAction({
                    name: String(form.get("name") ?? ""),
                    opening_balance: String(form.get("opening_balance") ?? ""),
                    is_active: true,
                  }),
                "Account created successfully.",
              );
            }}
          >
            <FormField label="Account Name" htmlFor="create-account-name" required>
              <Input
                id="create-account-name"
                name="name"
                required
                maxLength={200}
                disabled={pending}
                placeholder="e.g. HDFC Current"
              />
            </FormField>
            <FormField label="Opening Balance" htmlFor="create-opening">
              <Input
                id="create-opening"
                name="opening_balance"
                inputMode="decimal"
                defaultValue=""
                disabled={pending}
                placeholder="e.g. 0.00 (optional)"
                onInput={(e) => {
                  e.currentTarget.value = signedDecimalOnly(e.currentTarget.value, 2);
                }}
              />
            </FormField>
            {formError && createOpen ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={handleCloseCreate}>
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
        open={Boolean(editAccount)}
        title="Edit Account"
        onClose={handleCloseEdit}
        disableClose={pending}
        footer={null}
      >
        {editAccount ? (
          <form
            key={`edit-account-${editAccount.id}`}
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateAccountAction({
                    id: editAccount.id,
                    name: String(form.get("name") ?? ""),
                    opening_balance: String(form.get("opening_balance") ?? ""),
                  }),
                "Account updated successfully.",
              );
            }}
          >
            <FormField label="Account Name" htmlFor="edit-account-name" required>
              <Input
                id="edit-account-name"
                name="name"
                required
                maxLength={200}
                defaultValue={editAccount.name}
                disabled={pending}
                placeholder="e.g. HDFC Current"
              />
            </FormField>
            <FormField
              label="Opening Balance"
              htmlFor="edit-opening"
              required
              help={
                editAccount.entry_count > 0
                  ? "Opening balance cannot be changed after entries exist."
                  : undefined
              }
            >
              <Input
                id="edit-opening"
                name={editAccount.entry_count > 0 ? undefined : "opening_balance"}
                inputMode="decimal"
                required={editAccount.entry_count === 0}
                defaultValue={String(editAccount.opening_balance)}
                disabled={pending || editAccount.entry_count > 0}
                readOnly={editAccount.entry_count > 0}
                placeholder="e.g. 0.00"
                onInput={(e) => {
                  e.currentTarget.value = signedDecimalOnly(e.currentTarget.value, 2);
                }}
              />
              {editAccount.entry_count > 0 ? (
                <input type="hidden" name="opening_balance" value={String(editAccount.opening_balance)} />
              ) : null}
            </FormField>
            {formError && editAccount ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditAccount(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivateAccount)}
        title="Deactivate Account?"
        description={
          deactivateAccount
            ? `${deactivateAccount.name} will not be available for new entries. Historical entries remain available.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        pending={pending}
        onCancel={() => setDeactivateAccount(null)}
        onConfirm={() => {
          if (!deactivateAccount) {
            return;
          }
          runMutation(
            () => setAccountActiveAction({ id: deactivateAccount.id, is_active: false }),
            "Account deactivated successfully.",
          );
        }}
      />

      <Dialog
        open={Boolean(cannotDeleteAccount)}
        title="Cannot Delete Account"
        onClose={() => setCannotDeleteAccount(null)}
        disableClose={pending}
        footer={
          <div className="ui-dialog-actions">
            {cannotDeleteAccount?.is_active ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  const acc = cannotDeleteAccount;
                  setCannotDeleteAccount(null);
                  setDeactivateAccount(acc);
                }}
              >
                Deactivate Instead
              </Button>
            ) : null}
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
        open={Boolean(deleteAccount)}
        title="Delete Account?"
        description={
          deleteAccount
            ? `Are you sure you want to permanently delete "${deleteAccount.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteAccount(null)}
        onConfirm={() => {
          if (!deleteAccount) {
            return;
          }
          runMutation(() => deleteAccountAction({ id: deleteAccount.id }), "Account deleted successfully.");
        }}
      />
    </>
  );
}
