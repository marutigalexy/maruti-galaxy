"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAccountAction } from "@/app/actions/accounts";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
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
  const params = new URLSearchParams();
  if (query.entry_type !== "all") {
    params.set("entry_type", query.entry_type);
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
  const qs = params.toString();
  return qs ? `/accounting/accounts/${accountId}?${qs}` : `/accounting/accounts/${accountId}`;
}

export function AccountDetailView({ account, query, entries, categories }: AccountDetailViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
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
        <IconButton tone="edit" label="Edit account" onClick={() => setEditOpen(true)}>
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>
      <div className="ui-detail-stack">
        <Card title="Account">
          <dl className="ui-property-list">
            <div className="ui-detail-item">
              <dt>Account Name</dt>
              <dd>{account.name}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Opening Balance</dt>
              <dd>{formatInr(account.opening_balance)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Total In</dt>
              <dd>{formatInr(account.total_in)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Total Out</dt>
              <dd>{formatInr(account.total_out)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Current Balance</dt>
              <dd>{formatInr(account.current_balance)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Total Entry Count</dt>
              <dd>{account.entry_count}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={account.is_active ? "active" : "inactive"} />
              </dd>
            </div>
          </dl>
          <p className="ui-field-help">
            Derived account balances. Current balance is Opening + Total In − Total Out.
          </p>
        </Card>
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
            { key: "date", header: "Date", render: (row) => formatDisplayDate(row.entry_date) },
            { key: "type", header: "Type", render: (row) => row.entry_type },
            { key: "category", header: "Category", render: (row) => row.category_name },
            {
              key: "amount",
              header: "Amount",
              numeric: true,
              render: (row) => formatInr(row.amount),
            },
            { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "—" },
          ]}
          rows={entries.records}
          rowKey={(row) => row.id}
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
    </>
  );
}
