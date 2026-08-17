"use client";

import { useRouter } from "next/navigation";

import { DatePicker } from "@/components/ui/date-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { queryHref } from "@/lib/api/query-href";
import { formatInr } from "@/lib/formatters";
import type { ProfitLossInput } from "@/lib/validation/reports";
import type { ProfitLossReport } from "@/services/reports/reports-service";

type ProfitLossViewProps = {
  query: ProfitLossInput;
  result: ProfitLossReport;
};

export function ProfitLossView({ query, result }: ProfitLossViewProps) {
  const router = useRouter();
  const pushQuery = (next: ProfitLossInput) => {
    router.push(queryHref("/reports/profit-loss", next));
  };

  return (
    <>
      <p className="ui-page-lede">
        Income − Expenses = Net Profit / Loss. Totals come from entries for the selected dates. No extra accounting
        lines are added.
      </p>
      <FilterBar
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
      <dl className="ui-summary-grid">
        <div className="ui-detail-item">
          <dt>Total Income</dt>
          <dd className="ui-amount-income">{formatInr(result.total_income)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Expense</dt>
          <dd className="ui-amount-expense">{formatInr(result.total_expense)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Net Profit / Loss</dt>
          <dd className={result.net < 0 ? "ui-amount-expense" : "ui-amount-income"}>{formatInr(result.net)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Entry Count</dt>
          <dd>{result.count}</dd>
        </div>
      </dl>
    </>
  );
}
