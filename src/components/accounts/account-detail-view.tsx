"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
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
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  const qs = params.toString();
  return qs ? `/accounting/accounts/${accountId}?${qs}` : `/accounting/accounts/${accountId}`;
}

export function AccountDetailView({ account, query, entries, categories }: AccountDetailViewProps) {
  const router = useRouter();
  const pushQuery = (next: ListEntriesInput) => {
    router.push(accountEntriesHref(account.id, next));
  };
  const filtered =
    query.entry_type !== "all" ||
    Boolean(query.category_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  return (
    <>
      <PageHeader
        title={account.name}
        description="Derived account balances. Current balance is Opening + Total In − Total Out."
      />
      <p className="ui-field-help">
        <Link href="/accounting/accounts">Back to Accounts</Link>
      </p>
      <dl className="ui-detail-grid">
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
      <section className="ui-section">
        <h2 className="ui-section-title">Related Entries</h2>
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
          emptyTitle={filtered ? "No entries match the selected filters." : "No entries yet."}
        />
        <Pagination
          page={entries.page}
          pageSize={entries.pageSize}
          totalCount={entries.totalCount}
          onPageChange={(page) => pushQuery({ ...query, page })}
          onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
        />
      </section>
    </>
  );
}
