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
import { formatInr } from "@/lib/formatters";
import type { ListAccountsInput } from "@/lib/validation/accounts";
import type { AccountRecord } from "@/services/accounts/accounts-service";

type AccountsViewProps = {
  query: ListAccountsInput;
  result: Paginated<AccountRecord>;
};

export function AccountsView({ query, result }: AccountsViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountRecord | null>(null);
  const [deactivateAccount, setDeactivateAccount] = useState<AccountRecord | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<AccountRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListAccountsInput) => {
    push(listHref("/accounting/accounts", next));
  };

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
          <AddButton
            onClick={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            Add Account
          </AddButton>
        }
        onReset={() => pushQuery({ search: "", status: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) =>
            push(listHref("/accounting/accounts", { ...query, search, page: 1 }))
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
            render: (row) => formatInr(row.opening_balance),
          },
          { key: "in", header: "Total In", numeric: true, render: (row) => formatInr(row.total_in) },
          { key: "out", header: "Total Out", numeric: true, render: (row) => formatInr(row.total_out) },
          {
            key: "balance",
            header: "Current Balance",
            numeric: true,
            render: (row) => formatInr(row.current_balance),
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
                  onClick={() => {
                    setFormError(null);
                    setEditAccount(row);
                  }}
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
                {row.entry_count === 0 ? (
                  <IconButton tone="delete" label="Delete account" onClick={() => setDeleteAccount(row)}>
                    <DeleteIcon width={16} height={16} />
                  </IconButton>
                ) : null}
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
        open={createOpen}
        title="Add Account"
        onClose={() => setCreateOpen(false)}
        disableClose={pending}
        footer={null}
      >
        <form
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
            <Input id="create-account-name" name="name" required disabled={pending} placeholder="e.g. HDFC Current" />
          </FormField>
          <FormField label="Opening Balance" htmlFor="create-opening" required>
            <Input
              id="create-opening"
              name="opening_balance"
              inputMode="decimal"
              required
              defaultValue="0.00"
              disabled={pending}
              placeholder="e.g. 0.00"
            />
          </FormField>
          {formError && createOpen ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editAccount)}
        title="Edit Account"
        onClose={() => setEditAccount(null)}
        disableClose={pending}
        footer={null}
      >
        {editAccount ? (
          <form
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

      <ConfirmDialog
        open={Boolean(deleteAccount)}
        title="Delete Account?"
        description={
          deleteAccount
            ? `${deleteAccount.name} will be permanently deleted. Accounts with entries cannot be deleted.`
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
