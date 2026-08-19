"use client";

import { FinancialKpiCards } from "@/components/reports/financial-kpi-cards";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { useQueryPush } from "@/hooks/use-query-push";
import { queryHref } from "@/lib/api/query-href";
import { formatInr } from "@/lib/formatters";
import type { ProfitLossInput } from "@/lib/validation/reports";
import type { ProfitLossReport } from "@/services/reports/reports-service";

type ProfitLossViewProps = {
  query: ProfitLossInput;
  result: ProfitLossReport;
};

function exportHref(query: ProfitLossInput): string {
  return queryHref("/api/export/profit-loss", {
    date_from: query.date_from,
    date_to: query.date_to,
  });
}

export function ProfitLossView({ query, result }: ProfitLossViewProps) {
  const { pending: queryPending, push } = useQueryPush();
  const pushQuery = (next: ProfitLossInput) => {
    push(queryHref("/reports/profit-loss", next));
  };
  const filtered = Boolean(query.date_from) || Boolean(query.date_to);

  return (
    <>
      <FilterBar
        action={<ExportButton href={exportHref(query)} />}
        onReset={() =>
          pushQuery({
            date_from: undefined,
            date_to: undefined,
          })
        }
      >
        <FormField label="Date From" htmlFor="report-pl-from">
          <DatePicker
            id="report-pl-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-pl-to">
          <DatePicker
            id="report-pl-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined })}
          />
        </FormField>
      </FilterBar>
      <FinancialKpiCards
        totalIncome={result.total_income}
        totalExpense={result.total_expense}
        net={result.net}
        totalEntries={result.count}
        loading={queryPending}
      />
      <DataTable
        caption="Profit and loss by month"
        columns={[
          { key: "month", header: "Month", render: (row) => row.label },
          {
            key: "income",
            header: "Total Income",
            numeric: true,
            render: (row) => <span className="ui-amount-income">{formatInr(row.total_income)}</span>,
          },
          {
            key: "expense",
            header: "Total Expense",
            numeric: true,
            render: (row) => <span className="ui-amount-expense">{formatInr(row.total_expense)}</span>,
          },
          {
            key: "net",
            header: "Net Profit/Loss",
            numeric: true,
            render: (row) => (
              <span className={row.net < 0 ? "ui-amount-expense" : "ui-amount-income"}>
                {formatInr(row.net)}
              </span>
            ),
          },
        ]}
        rows={result.months}
        rowKey={(row) => row.month}
        loading={queryPending}
        emptyTitle={filtered ? "No entries match the selected dates." : "No entries found."}
      />
    </>
  );
}
