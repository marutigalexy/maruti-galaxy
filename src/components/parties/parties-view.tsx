"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createPartyAction,
  deletePartyAction,
  setPartyActiveAction,
  updatePartyAction,
} from "@/app/actions/parties";
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
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { ListPartiesInput } from "@/lib/validation/parties";
import type { PartyRecord } from "@/services/parties/parties-service";

type PartiesViewProps = {
  query: ListPartiesInput;
  result: Paginated<PartyRecord>;
};

export function PartiesView({ query, result }: PartiesViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editParty, setEditParty] = useState<PartyRecord | null>(null);
  const [deactivateParty, setDeactivateParty] = useState<PartyRecord | null>(null);
  const [deleteParty, setDeleteParty] = useState<PartyRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const pushQuery = (next: ListPartiesInput) => {
    push(listHref("/parties", next));
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
      setEditParty(null);
      setDeactivateParty(null);
      setDeleteParty(null);
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
            Add Party
          </AddButton>
        }
        onReset={() => pushQuery({ search: "", status: "all", page: 1, pageSize: query.pageSize })}
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search company or mobile"
        />
        <FormField label="Status" htmlFor="party-status">
          <Select
            id="party-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({ ...query, status: event.target.value as ListPartiesInput["status"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        caption="Parties"
        columns={[
          { key: "company", header: "Company Name", render: (row) => <strong>{row.company_name}</strong> },
          { key: "contact", header: "Contact Person", render: (row) => row.contact_person_name ?? "—" },
          { key: "mobile", header: "Mobile", render: (row) => row.mobile_number },
          { key: "price", header: "Price", numeric: true, render: (row) => formatInr(row.price) },
          {
            key: "created_at",
            header: "Created At",
            render: (row) => formatDisplayDate(row.created_at),
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
                  label="Edit party"
                  onClick={() => {
                    setFormError(null);
                    setEditParty(row);
                  }}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
                {row.is_active ? (
                  <IconButton tone="deactivate" label="Deactivate party" onClick={() => setDeactivateParty(row)}>
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    tone="activate"
                    label="Activate party"
                    onClick={() =>
                      runMutation(
                        () => setPartyActiveAction({ id: row.id, is_active: true }),
                        "Party activated successfully.",
                      )
                    }
                  >
                    <PowerIcon width={16} height={16} />
                  </IconButton>
                )}
                <IconButton tone="delete" label="Delete party" onClick={() => setDeleteParty(row)}>
                  <DeleteIcon width={16} height={16} />
                </IconButton>
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/parties/${row.id}`)}
        loading={queryPending}
        emptyTitle={
          query.search || query.status !== "all" ? "No parties match the selected filters." : "No parties found."
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
        title="Add Party"
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
                createPartyAction({
                  company_name: String(form.get("company_name") ?? ""),
                  contact_person_name: String(form.get("contact_person_name") ?? ""),
                  mobile_number: String(form.get("mobile_number") ?? ""),
                  price: String(form.get("price") ?? ""),
                  is_active: true,
                }),
              "Party created successfully.",
            );
          }}
        >
          <FormField label="Company Name" htmlFor="create-company" required>
            <Input id="create-company" name="company_name" required disabled={pending} placeholder="e.g. Shree Ram Diamonds" />
          </FormField>
          <FormField label="Contact Person Name" htmlFor="create-contact">
            <Input id="create-contact" name="contact_person_name" disabled={pending} placeholder="e.g. Amit Patel" />
          </FormField>
          <FormField label="Mobile Number" htmlFor="create-mobile" required>
            <Input id="create-mobile" name="mobile_number" required disabled={pending} placeholder="e.g. 9876543210" />
          </FormField>
          <FormField label="Price/Than" htmlFor="create-price">
            <Input id="create-price" name="price" inputMode="decimal" disabled={pending} placeholder="e.g. 1500.00 (optional)" className="ui-price" />
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
        open={Boolean(editParty)}
        title="Edit Party"
        onClose={() => setEditParty(null)}
        disableClose={pending}
        footer={null}
      >
        {editParty ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updatePartyAction({
                    id: editParty.id,
                    company_name: String(form.get("company_name") ?? ""),
                    contact_person_name: String(form.get("contact_person_name") ?? ""),
                    mobile_number: String(form.get("mobile_number") ?? ""),
                    price: String(form.get("price") ?? ""),
                  }),
                "Party updated successfully.",
              );
            }}
          >
            <FormField label="Company Name" htmlFor="edit-company" required>
              <Input
                id="edit-company"
                name="company_name"
                required
                defaultValue={editParty.company_name}
                disabled={pending}
                placeholder="e.g. Shree Ram Diamonds"
              />
            </FormField>
            <FormField label="Contact Person Name" htmlFor="edit-contact">
              <Input
                id="edit-contact"
                name="contact_person_name"
                defaultValue={editParty.contact_person_name ?? ""}
                disabled={pending}
                placeholder="e.g. Amit Patel"
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="edit-mobile" required>
              <Input
                id="edit-mobile"
                name="mobile_number"
                required
                defaultValue={editParty.mobile_number}
                disabled={pending}
                placeholder="e.g. 9876543210"
              />
            </FormField>
            <FormField
              label="Price/Than"
              htmlFor="edit-price"
            >
              <Input
                id="edit-price"
                name="price"
                inputMode="decimal"
                defaultValue={editParty.price > 0 ? String(editParty.price) : ""}
                disabled={pending}
                placeholder="e.g. 1500.00 (optional)"
                className="ui-price"
              />
            </FormField>
            {formError && editParty ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setEditParty(null)}>
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
        open={Boolean(deactivateParty)}
        title="Deactivate Party?"
        description={
          deactivateParty
            ? `${deactivateParty.company_name} will be hidden from new job dropdowns. Historical jobs remain available.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        pending={pending}
        onCancel={() => setDeactivateParty(null)}
        onConfirm={() => {
          if (!deactivateParty) {
            return;
          }
          runMutation(
            () => setPartyActiveAction({ id: deactivateParty.id, is_active: false }),
            "Party deactivated successfully.",
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteParty)}
        title="Delete Party?"
        description={
          deleteParty
            ? `${deleteParty.company_name} will be permanently deleted if it has no jobs or accounting entries. Prefer deactivating if it is already in use.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteParty(null)}
        onConfirm={() => {
          if (!deleteParty) {
            return;
          }
          runMutation(() => deletePartyAction({ id: deleteParty.id }), "Party deleted successfully.");
        }}
      />
    </>
  );
}
