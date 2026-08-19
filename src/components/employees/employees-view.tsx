"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createEmployeeAction,
  deleteEmployeeAction,
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/app/actions/employees";
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
import type { ListEmployeesInput } from "@/lib/validation/employees";
import type { EmployeeRecord } from "@/services/employees/employees-service";

type EmployeesViewProps = {
  query: ListEmployeesInput;
  result: Paginated<EmployeeRecord>;
};

export function EmployeesView({ query, result }: EmployeesViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeRecord | null>(null);
  const [deactivateEmployee, setDeactivateEmployee] = useState<EmployeeRecord | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListEmployeesInput) => {
    push(listHref("/employees", next));
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
      setEditEmployee(null);
      setDeactivateEmployee(null);
      setDeleteEmployee(null);
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
            Add Employee
          </AddButton>
        }
        onReset={() => pushQuery({ search: "", status: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => push(listHref("/employees", { ...query, search, page: 1 }))}
          placeholder="Search name or mobile"
        />
        <FormField label="Status" htmlFor="employee-status">
          <Select
            id="employee-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({
                ...query,
                status: event.target.value as ListEmployeesInput["status"],
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
        caption="Employees"
        columns={[
          { key: "name", header: "Employee Name", render: (row) => row.name },
          { key: "mobile", header: "Mobile Number", render: (row) => row.mobile_number },
          {
            key: "commission",
            header: "Commission",
            numeric: true,
            render: (row) => formatInr(row.commission),
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
                  label="Edit employee"
                  onClick={() => {
                    setFormError(null);
                    setEditEmployee(row);
                  }}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                {row.is_active ? (
                  <IconButton tone="deactivate" label="Deactivate employee" onClick={() => setDeactivateEmployee(row)}>
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    tone="activate"
                    label="Activate employee"
                    onClick={() =>
                      runMutation(
                        () => setEmployeeActiveAction({ id: row.id, is_active: true }),
                        "Employee activated successfully.",
                      )
                    }
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                )}
                <IconButton tone="delete" label="Delete employee" onClick={() => setDeleteEmployee(row)}>
                  <DeleteIcon width={16} height={16} />
                </IconButton>
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/employees/${row.id}`)}
        loading={queryPending}
        emptyTitle={
          query.search || query.status !== "all"
            ? "No employees match the selected filters."
            : "No employees found."
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
        title="Add Employee"
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
                createEmployeeAction({
                  name: String(form.get("name") ?? ""),
                  mobile_number: String(form.get("mobile_number") ?? ""),
                  commission: String(form.get("commission") ?? ""),
                  is_active: true,
                }),
              "Employee created successfully.",
            );
          }}
        >
          <FormField label="Name" htmlFor="create-employee-name" required>
            <Input id="create-employee-name" name="name" required disabled={pending} placeholder="e.g. Rahul Sharma" />
          </FormField>
          <FormField label="Mobile Number" htmlFor="create-employee-mobile" required>
            <Input id="create-employee-mobile" name="mobile_number" required disabled={pending} placeholder="e.g. 9876543210" />
          </FormField>
          <FormField
            label="Commission"
            htmlFor="create-commission"
            required
          >
            <Input id="create-commission" name="commission" inputMode="decimal" required disabled={pending} placeholder="e.g. 50.00" />
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
        open={Boolean(editEmployee)}
        title="Edit Employee"
        onClose={() => setEditEmployee(null)}
        disableClose={pending}
        footer={null}
      >
        {editEmployee ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateEmployeeAction({
                    id: editEmployee.id,
                    name: String(form.get("name") ?? ""),
                    mobile_number: String(form.get("mobile_number") ?? ""),
                    commission: String(form.get("commission") ?? ""),
                  }),
                "Employee updated successfully.",
              );
            }}
          >
            <FormField label="Name" htmlFor="edit-employee-name" required>
              <Input
                id="edit-employee-name"
                name="name"
                required
                defaultValue={editEmployee.name}
                disabled={pending}
                placeholder="e.g. Rahul Sharma"
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="edit-employee-mobile" required>
              <Input
                id="edit-employee-mobile"
                name="mobile_number"
                required
                defaultValue={editEmployee.mobile_number}
                disabled={pending}
                placeholder="e.g. 9876543210"
              />
            </FormField>
            <FormField
              label="Commission"
              htmlFor="edit-commission"
              required
            >
              <Input
                id="edit-commission"
                name="commission"
                inputMode="decimal"
                required
                defaultValue={String(editEmployee.commission)}
                disabled={pending}
                placeholder="e.g. 50.00"
              />
            </FormField>
            {formError && editEmployee ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditEmployee(null)}>
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
        open={Boolean(deactivateEmployee)}
        title="Deactivate Employee?"
        description={
          deactivateEmployee
            ? `${deactivateEmployee.name} will be hidden from new work assignment. Historical work remains available.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        pending={pending}
        onCancel={() => setDeactivateEmployee(null)}
        onConfirm={() => {
          if (!deactivateEmployee) {
            return;
          }
          runMutation(
            () => setEmployeeActiveAction({ id: deactivateEmployee.id, is_active: false }),
            "Employee deactivated successfully.",
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteEmployee)}
        title="Delete Employee?"
        description={
          deleteEmployee
            ? `${deleteEmployee.name} will be permanently deleted if there are no work records or accounting entries. Prefer deactivating if this employee is already in use.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteEmployee(null)}
        onConfirm={() => {
          if (!deleteEmployee) {
            return;
          }
          runMutation(
            () => deleteEmployeeAction({ id: deleteEmployee.id }),
            "Employee deleted successfully.",
          );
        }}
      />
    </>
  );
}
