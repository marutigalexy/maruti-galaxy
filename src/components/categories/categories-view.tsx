"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
} from "@/app/actions/categories";
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
import type { Paginated } from "@/lib/api/pagination";
import { queryHref } from "@/lib/api/query-href";
import type { ListCategoriesInput } from "@/lib/validation/categories";
import type { CategoryRecord } from "@/services/categories/categories-service";

type CategoriesViewProps = {
  query: ListCategoriesInput;
  result: Paginated<CategoryRecord>;
};

export function CategoriesView({ query, result }: CategoriesViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRecord | null>(null);
  const [deactivateCategory, setDeactivateCategory] = useState<CategoryRecord | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<CategoryRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListCategoriesInput) => {
    push(
      queryHref("/accounting/categories", {
        search: next.search,
        status: next.status,
        type: next.type,
        page: next.page,
      }),
    );
  };

  function handleOpenCreate() {
    setFormError(null);
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setFormError(null);
    setCreateOpen(false);
  }

  function handleOpenEdit(cat: CategoryRecord) {
    setFormError(null);
    setEditCategory(cat);
  }

  function handleCloseEdit() {
    setFormError(null);
    setEditCategory(null);
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
      setEditCategory(null);
      setDeactivateCategory(null);
      setDeleteCategory(null);
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <>
      <FilterBar
        action={
          <>
            <ExportButton
              href={queryHref("/api/export/categories", {
                search: query.search,
                status: query.status,
                type: query.type,
              })}
            />
            <AddButton onClick={handleOpenCreate}>
              Add Category
            </AddButton>
          </>
        }
        onReset={() => pushQuery({ search: "", status: "all", type: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search category name"
        />
        <FormField label="Type" htmlFor="category-type">
          <Select
            id="category-type"
            value={query.type}
            onChange={(event) =>
              pushQuery({
                ...query,
                type: event.target.value as ListCategoriesInput["type"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </Select>
        </FormField>
        <FormField label="Status" htmlFor="category-status">
          <Select
            id="category-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({
                ...query,
                status: event.target.value as ListCategoriesInput["status"],
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
        caption="Categories"
        columns={[
          { key: "name", header: "Category Name", render: (row) => row.name },
          {
            key: "type",
            header: "Type",
            render: (row) => (
              <StatusBadge tone={row.type === "Income" ? "income" : "expense"} label={row.type} />
            ),
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
                  label="Edit category"
                  onClick={() => handleOpenEdit(row)}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                {row.is_active ? (
                  <IconButton tone="deactivate" label="Deactivate category" onClick={() => setDeactivateCategory(row)}>
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    tone="activate"
                    label="Activate category"
                    onClick={() =>
                      runMutation(
                        () => setCategoryActiveAction({ id: row.id, is_active: true }),
                        "Category activated successfully.",
                      )
                    }
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                )}
                {row.entry_count === 0 ? (
                  <IconButton tone="delete" label="Delete category" onClick={() => setDeleteCategory(row)}>
                    <DeleteIcon width={16} height={16} />
                  </IconButton>
                ) : null}
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => handleOpenEdit(row)}
        loading={queryPending}
        emptyTitle={
          query.search || query.status !== "all" || query.type !== "all"
            ? "No categories match the selected filters."
            : "No categories found."
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
        title="Add Category"
        onClose={handleCloseCreate}
        disableClose={pending}
        footer={null}
      >
        {createOpen ? (
          <form
            key="create-category-form"
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  createCategoryAction({
                    name: String(form.get("name") ?? ""),
                    type: String(form.get("type") ?? ""),
                    is_active: String(form.get("is_active") ?? "true") === "true",
                  }),
                "Category created successfully.",
              );
            }}
          >
            <FormField label="Category Name" htmlFor="create-category-name" required>
              <Input id="create-category-name" name="name" required disabled={pending} placeholder="e.g. Job Income" />
            </FormField>
            <FormField label="Type" htmlFor="create-category-type" required>
              <Select id="create-category-type" name="type" required disabled={pending} defaultValue="Income">
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="create-category-status">
              <Select id="create-category-status" name="is_active" disabled={pending} defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
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
        open={Boolean(editCategory)}
        title="Edit Category"
        onClose={handleCloseEdit}
        disableClose={pending}
        footer={null}
      >
        {editCategory ? (
          <form
            key={`edit-category-${editCategory.id}`}
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateCategoryAction({
                    id: editCategory.id,
                    name: String(form.get("name") ?? ""),
                    type: String(form.get("type") ?? ""),
                  }),
                "Category updated successfully.",
              );
            }}
          >
            <FormField label="Category Name" htmlFor="edit-category-name" required>
              <Input
                id="edit-category-name"
                name="name"
                required
                defaultValue={editCategory.name}
                disabled={pending}
                placeholder="e.g. Job Income"
              />
            </FormField>
            <FormField
              label="Type"
              htmlFor="edit-category-type"
              required
              help={
                editCategory.entry_count > 0
                  ? "Type cannot be changed because this category has entries."
                  : undefined
              }
            >
              <Select
                id="edit-category-type"
                name={editCategory.entry_count > 0 ? undefined : "type"}
                required={editCategory.entry_count === 0}
                defaultValue={editCategory.type}
                disabled={pending || editCategory.entry_count > 0}
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </Select>
              {editCategory.entry_count > 0 ? (
                <input type="hidden" name="type" value={editCategory.type} />
              ) : null}
            </FormField>
            {formError && editCategory ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditCategory(null)}>
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
        open={Boolean(deactivateCategory)}
        title="Deactivate Category?"
        description={
          deactivateCategory
            ? `${deactivateCategory.name} will be hidden from new entry dropdowns. Historical entries remain available.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        pending={pending}
        onCancel={() => setDeactivateCategory(null)}
        onConfirm={() => {
          if (!deactivateCategory) {
            return;
          }
          runMutation(
            () => setCategoryActiveAction({ id: deactivateCategory.id, is_active: false }),
            "Category deactivated successfully.",
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteCategory)}
        title="Delete Category?"
        description={
          deleteCategory
            ? `${deleteCategory.name} will be permanently deleted. Categories linked to entries cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteCategory(null)}
        onConfirm={() => {
          if (!deleteCategory) {
            return;
          }
          runMutation(
            () => deleteCategoryAction({ id: deleteCategory.id }),
            "Category deleted successfully.",
          );
        }}
      />
    </>
  );
}
