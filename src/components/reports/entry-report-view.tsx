"use client";

import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { queryHref } from "@/lib/api/query-href";
import { formatDisplayDate, formatInr } from "@/lib/formatters";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { EntryListRecord, ListedEntries } from "@/services/entries/entries-service";
import type { PartyOption } from "@/services/parties/parties-service";

type EntryReportViewProps = {
  query: ListEntriesInput;
  result: ListedEntries;
  accounts: AccountOption[];
  categories: CategoryOption[];
  parties: PartyOption[];
  employees: EmployeeOption[];
};

function exportHref(query: ListEntriesInput): string {
  return queryHref("/api/export/entries", {
    search: query.search,
    entry_type: query.entry_type,
    account_id: query.account_id,
    category_id: query.category_id,
    party_id: query.party_id,
    employee_id: query.employee_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });
}

export function EntryReportView({
  query,
  result,
  accounts,
  categories,
  parties,
  employees,
}: EntryReportViewProps) {
  const router = useRouter();
  const pushQuery = (next: ListEntriesInput) => {
    router.push(queryHref("/reports/entries", next));
  };
  const filtered =
    Boolean(query.search) ||
    query.entry_type !== "all" ||
    Boolean(query.account_id) ||
    Boolean(query.category_id) ||
    Boolean(query.party_id) ||
    Boolean(query.employee_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  return (
    <>
      <FilterBar
        action={
          <a className="ui-button ui-button-secondary" href={exportHref(query)}>
            Export
          </a>
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
        <FormField label="Entry Type" htmlFor="report-entry-type">
          <Select
            id="report-entry-type"
            value={query.entry_type}
            onChange={(event) =>
              pushQuery({ ...query, entry_type: event.target.value as ListEntriesInput["entry_type"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </Select>
        </FormField>
        <FormField label="Account" htmlFor="report-entry-account">
          <Select
            id="report-entry-account"
            value={query.account_id ?? ""}
            onChange={(event) => pushQuery({ ...query, account_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Category" htmlFor="report-entry-category">
          <Select
            id="report-entry-category"
            value={query.category_id ?? ""}
            onChange={(event) => pushQuery({ ...query, category_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.type})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Party" htmlFor="report-entry-party">
          <Select
            id="report-entry-party"
            value={query.party_id ?? ""}
            onChange={(event) => pushQuery({ ...query, party_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.company_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Employee" htmlFor="report-entry-employee">
          <Select
            id="report-entry-employee"
            value={query.employee_id ?? ""}
            onChange={(event) => pushQuery({ ...query, employee_id: event.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date From" htmlFor="report-entry-from">
          <DatePicker
            id="report-entry-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-entry-to">
          <DatePicker
            id="report-entry-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })}
          />
        </FormField>
      </FilterBar>
      <dl className="ui-summary-grid">
        <div className="ui-detail-item">
          <dt>Total Income</dt>
          <dd className="ui-amount-income">{formatInr(result.summary.total_income)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Expense</dt>
          <dd className="ui-amount-expense">{formatInr(result.summary.total_expense)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Net Amount</dt>
          <dd className={result.summary.net < 0 ? "ui-amount-expense" : "ui-amount-income"}>
            {formatInr(result.summary.net)}
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Entry Count</dt>
          <dd>{result.summary.count}</dd>
        </div>
      </dl>
      <DataTable
        caption="Entry report"
        columns={[
          { key: "date", header: "Date", render: (row: EntryListRecord) => formatDisplayDate(row.entry_date) },
          {
            key: "type",
            header: "Type",
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
            render: (row) => formatInr(row.amount),
          },
          { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "—" },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        emptyTitle={filtered ? "No entries match the selected filters." : "No entries found."}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        onPageChange={(page) => pushQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
      />
    </>
  );
}
