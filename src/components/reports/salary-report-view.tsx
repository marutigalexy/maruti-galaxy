"use client";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { useQueryPush } from "@/hooks/use-query-push";
import { queryHref } from "@/lib/api/query-href";
import type { Paginated } from "@/lib/api/pagination";
import { formatInr, formatThan } from "@/lib/formatters";
import type { SalaryReportInput } from "@/lib/validation/reports";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { SalaryReportRow } from "@/services/reports/reports-service";

type SalaryReportViewProps = {
  query: SalaryReportInput;
  result: Paginated<SalaryReportRow>;
  employees?: EmployeeOption[];
};

function exportHref(query: SalaryReportInput): string {
  return queryHref("/api/export/salary", {
    search: query.search,
    employee_id: query.employee_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });
}

export function SalaryReportView({ query, result }: SalaryReportViewProps) {
  const { pending: queryPending, push } = useQueryPush();
  const pushQuery = (next: SalaryReportInput) => {
    push(queryHref("/reports/salary", next));
  };
  const filtered = Boolean(query.search) || Boolean(query.employee_id) || Boolean(query.date_from) || Boolean(query.date_to);

  return (
    <>
      <FilterBar
        action={<ExportButton href={exportHref(query)} />}
        onReset={() =>
          pushQuery({
            search: "",
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
          placeholder="Search employee name"
        />
        <FormField label="Date From" htmlFor="report-salary-from">
          <DatePicker
            id="report-salary-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-salary-to">
          <DatePicker
            id="report-salary-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })}
          />
        </FormField>
      </FilterBar>
      <DataTable
        caption="Salary report"
        columns={[
          { key: "name", header: "Employee", render: (row) => row.name },
          {
            key: "total_than",
            header: "Total Than",
            numeric: true,
            render: (row) => <span className="ui-amount-than">{formatThan(row.total_than)}</span>,
          },
          {
            key: "earned",
            header: "Total Earnings",
            numeric: true,
            render: (row) => <span className="ui-amount-income">{formatInr(row.earned)}</span>,
          },
          {
            key: "paid",
            header: "Paid Amount",
            numeric: true,
            render: (row) => <span className="ui-amount-expense">{formatInr(row.paid)}</span>,
          },
          {
            key: "difference",
            header: "Remaining Amount",
            numeric: true,
            render: (row) => (
              <span className={row.difference < 0 ? "ui-amount-negative" : "ui-amount-positive"}>
                {formatInr(Math.abs(row.difference))}
              </span>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        loading={queryPending}
        emptyTitle={filtered ? "No employees match the selected filters." : "No employees found."}
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
    </>
  );
}
