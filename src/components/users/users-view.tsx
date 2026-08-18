"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createUserAction,
  setUserActiveAction,
  updateUserPasswordAction,
  updateUserProfileAction,
} from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon, KeyIcon, PowerIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate } from "@/lib/formatters";
import type { ListUsersInput } from "@/lib/validation/users";
import type { UserRecord } from "@/services/users/users-service";

type UsersViewProps = {
  currentUserId: string;
  query: ListUsersInput;
  result: Paginated<UserRecord>;
};

function usersHref(query: Partial<ListUsersInput> & Pick<ListUsersInput, "page" | "pageSize" | "search" | "status">) {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  const qs = params.toString();
  return qs ? `/users?${qs}` : "/users";
}

export function UsersView({ currentUserId, query, result }: UsersViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListUsersInput) => {
    router.push(usersHref(next));
  };

  const onSearch = (search: string) => {
    router.push(usersHref({ ...query, search, page: 1 }));
  };

  function runMutation(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    setFormError(null);
    startTransition(async () => {
      const outcome = await action();
      if (!outcome.ok) {
        setFormError(outcome.error?.message ?? "Unable to save.");
        toast.error(outcome.error?.message ?? "Unable to save.");
        return;
      }
      setCreateOpen(false);
      setEditUser(null);
      setPasswordUser(null);
      setDeactivateUser(null);
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
            Add User
          </AddButton>
        }
        onReset={() => pushQuery({ search: "", status: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput value={query.search} onValueChange={onSearch} placeholder="Search name or email" />
        <FormField label="Status" htmlFor="user-status">
          <Select
            id="user-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({ ...query, status: event.target.value as ListUsersInput["status"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        caption="Users"
        columns={[
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "email", header: "Email", render: (row) => row.email },
          { key: "role", header: "Role", render: (row) => (row.role === "admin" ? "Admin" : row.role) },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge tone={row.is_active ? "active" : "inactive"} />,
          },
          { key: "created", header: "Created", render: (row) => formatDisplayDate(row.created_at) },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <TableActions>
                <IconButton
                  tone="edit"
                  label="Edit user"
                  onClick={() => {
                    setFormError(null);
                    setEditUser(row);
                  }}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                <IconButton
                  tone="password"
                  label="Change password"
                  onClick={() => {
                    setFormError(null);
                    setPasswordUser(row);
                  }}
                >
                  <KeyIcon width={16} height={16} />
                </IconButton>
                {row.is_active ? (
                  <IconButton
                    tone="deactivate"
                    label="Deactivate user"
                    disabled={row.id === currentUserId}
                    onClick={() => setDeactivateUser(row)}
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    tone="activate"
                    label="Activate user"
                    onClick={() =>
                      runMutation(
                        () => setUserActiveAction({ id: row.id, is_active: true }),
                        "User activated successfully.",
                      )
                    }
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                )}
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setFormError(null);
          setEditUser(row);
        }}
        emptyTitle={query.search || query.status !== "all" ? "No users match the selected filters." : "No users found."}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        onPageChange={(page) => pushQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
      />

      <Dialog
        open={createOpen}
        title="Add User"
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
                createUserAction({
                  name: String(form.get("name") ?? ""),
                  email: String(form.get("email") ?? ""),
                  password: String(form.get("password") ?? ""),
                  confirmPassword: String(form.get("confirmPassword") ?? ""),
                  is_active: true,
                }),
              "User created successfully.",
            );
          }}
        >
          <FormField label="Name" htmlFor="create-name" required>
            <Input id="create-name" name="name" required disabled={pending} autoComplete="name" placeholder="e.g. Priya Mehta" />
          </FormField>
          <FormField label="Email" htmlFor="create-email" required>
            <Input id="create-email" name="email" type="email" required disabled={pending} autoComplete="off" placeholder="name@company.com" />
          </FormField>
          <FormField label="Password" htmlFor="create-password" required>
            <Input
              id="create-password"
              name="password"
              type="password"
              required
              disabled={pending}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </FormField>
          <FormField label="Confirm Password" htmlFor="create-confirm" required>
            <Input
              id="create-confirm"
              name="confirmPassword"
              type="password"
              required
              disabled={pending}
              autoComplete="new-password"
              placeholder="Re-enter password"
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editUser)}
        title="Edit User"
        onClose={() => setEditUser(null)}
        disableClose={pending}
        footer={null}
      >
        {editUser ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateUserProfileAction({
                    id: editUser.id,
                    name: String(form.get("name") ?? ""),
                    email: String(form.get("email") ?? ""),
                  }),
                "User updated successfully.",
              );
            }}
          >
            <FormField label="Name" htmlFor="edit-name" required>
              <Input id="edit-name" name="name" required defaultValue={editUser.name} disabled={pending} placeholder="e.g. Priya Mehta" />
            </FormField>
            <FormField label="Email" htmlFor="edit-email" required>
              <Input
                id="edit-email"
                name="email"
                type="email"
                required
                defaultValue={editUser.email}
                disabled={pending}
                placeholder="name@company.com"
              />
            </FormField>
            {formError && editUser ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(passwordUser)}
        title="Update Password"
        onClose={() => setPasswordUser(null)}
        disableClose={pending}
        footer={null}
      >
        {passwordUser ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateUserPasswordAction({
                    id: passwordUser.id,
                    password: String(form.get("password") ?? ""),
                    confirmPassword: String(form.get("confirmPassword") ?? ""),
                  }),
                "Password updated successfully.",
              );
            }}
          >
            <FormField label="New Password" htmlFor="pw-password" required>
              <Input
                id="pw-password"
                name="password"
                type="password"
                required
                disabled={pending}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </FormField>
            <FormField label="Confirm Password" htmlFor="pw-confirm" required>
              <Input
                id="pw-confirm"
                name="confirmPassword"
                type="password"
                required
                disabled={pending}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </FormField>
            {formError && passwordUser ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setPasswordUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Update Password"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivateUser)}
        title="Deactivate User?"
        description={
          deactivateUser
            ? `${deactivateUser.name} will no longer be able to use Maruti Galaxy. Historical records will remain available.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        pending={pending}
        onCancel={() => setDeactivateUser(null)}
        onConfirm={() => {
          if (!deactivateUser) {
            return;
          }
          runMutation(
            () => setUserActiveAction({ id: deactivateUser.id, is_active: false }),
            "User deactivated successfully.",
          );
        }}
      />
    </>
  );
}
