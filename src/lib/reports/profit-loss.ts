import { formatMonthYear } from "@/lib/formatters";

export type ProfitLossMonthInput = {
  entry_date: string;
  entry_type: "Income" | "Expense";
  amount: number;
};

export type ProfitLossMonthRow = {
  month: string;
  label: string;
  total_income: number;
  total_expense: number;
  net: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function groupProfitLossByMonth(rows: ProfitLossMonthInput[]): ProfitLossMonthRow[] {
  const buckets = new Map<string, { total_income: number; total_expense: number }>();
  for (const row of rows) {
    const month = row.entry_date.slice(0, 7);
    const current = buckets.get(month) ?? { total_income: 0, total_expense: 0 };
    if (row.entry_type === "Income") {
      current.total_income += row.amount;
    } else {
      current.total_expense += row.amount;
    }
    buckets.set(month, current);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, totals]) => ({
      month,
      label: formatMonthYear(month),
      total_income: roundMoney(totals.total_income),
      total_expense: roundMoney(totals.total_expense),
      net: roundMoney(totals.total_income - totals.total_expense),
    }));
}
