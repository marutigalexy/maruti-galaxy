import { KpiGridSkeleton } from "@/components/ui/skeleton";
import { formatSignedInr } from "@/lib/formatters";

type FinancialKpiCardsProps = {
  totalIncome: number;
  totalExpense: number;
  net: number;
  totalEntries: number;
  loading?: boolean;
  netLabel?: string;
};

function netHelp(net: number): string {
  if (net < 0) {
    return "Loss · Income − Expenses";
  }
  if (net > 0) {
    return "Profit · Income − Expenses";
  }
  return "Break even · Income − Expenses";
}

export function FinancialKpiCards({
  totalIncome,
  totalExpense,
  net,
  totalEntries,
  loading = false,
  netLabel,
}: FinancialKpiCardsProps) {
  const isLoss = net < 0;
  const resolvedNetLabel = netLabel ?? (isLoss ? "Net Loss" : net > 0 ? "Net Profit" : "Net Profit/Loss");

  return (
    <section className="ui-section" aria-label="Financial summary">
      {loading ? (
        <KpiGridSkeleton count={4} />
      ) : (
        <div className="ui-kpi-grid">
          <article className="ui-kpi-card">
            <p className="ui-kpi-label">Total Income</p>
            <p className="ui-kpi-value ui-amount-income">{formatSignedInr("Income", totalIncome)}</p>
          </article>
          <article className="ui-kpi-card">
            <p className="ui-kpi-label">Total Expense</p>
            <p className="ui-kpi-value ui-amount-expense">{formatSignedInr("Expense", totalExpense)}</p>
          </article>
          <article className="ui-kpi-card">
            <p className="ui-kpi-label">{resolvedNetLabel}</p>
            <p className={`ui-kpi-value ${isLoss ? "ui-amount-negative" : "ui-amount-positive"}`}>
              {isLoss
                ? formatSignedInr("Expense", Math.abs(net))
                : formatSignedInr("Income", net)}
            </p>
            <p className="ui-kpi-help">{netHelp(net)}</p>
          </article>
          <article className="ui-kpi-card">
            <p className="ui-kpi-label">Total Entries</p>
            <p className="ui-kpi-value">{totalEntries}</p>
          </article>
        </div>
      )}
    </section>
  );
}
