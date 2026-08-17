import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { DashboardSnapshot } from "@/services/dashboard/dashboard-service";

type DashboardViewProps = {
  snapshot: DashboardSnapshot;
};

function jobTone(status: string) {
  if (status === "Progress") {
    return "progress" as const;
  }
  if (status === "Completed") {
    return "completed" as const;
  }
  return "pending" as const;
}

export function DashboardView({ snapshot }: DashboardViewProps) {
  return (
    <>
      <section className="ui-section" aria-label="Job counts">
        <div className="ui-kpi-grid">
          <Link className="ui-kpi-card" href="/jobs">
            <p className="ui-kpi-label">Total Jobs</p>
            <p className="ui-kpi-value">{snapshot.jobs_total}</p>
            <p className="ui-kpi-help">All time</p>
          </Link>
          <Link className="ui-kpi-card" href="/jobs?status=Pending">
            <p className="ui-kpi-label">Pending Jobs</p>
            <p className="ui-kpi-value">{snapshot.jobs_pending}</p>
            <p className="ui-kpi-help">All time</p>
          </Link>
          <Link className="ui-kpi-card" href="/jobs?status=Progress">
            <p className="ui-kpi-label">Progress Jobs</p>
            <p className="ui-kpi-value">{snapshot.jobs_progress}</p>
            <p className="ui-kpi-help">All time</p>
          </Link>
          <Link className="ui-kpi-card" href="/jobs?status=Completed">
            <p className="ui-kpi-label">Completed Jobs</p>
            <p className="ui-kpi-value">{snapshot.jobs_completed}</p>
            <p className="ui-kpi-help">All time</p>
          </Link>
        </div>
      </section>
      <section className="ui-section" aria-label="Financial summary">
        <h2 className="ui-section-title">Financial overview</h2>
        <div className="ui-kpi-grid">
          <Link className="ui-kpi-card" href="/jobs">
            <p className="ui-kpi-label">Total Than</p>
            <p className="ui-kpi-value">{formatThan(snapshot.total_than)}</p>
            <p className="ui-kpi-help">All jobs</p>
          </Link>
          <Link className="ui-kpi-card" href="/reports/salary">
            <p className="ui-kpi-label">Employee Earnings</p>
            <p className="ui-kpi-value">{formatInr(snapshot.employee_earnings)}</p>
            <p className="ui-kpi-help">All time work</p>
          </Link>
          <Link
            className="ui-kpi-card"
            href={`/accounting/entries?entry_type=Income&date_from=${snapshot.month_from}&date_to=${snapshot.month_to}`}
          >
            <p className="ui-kpi-label">Total Income</p>
            <p className="ui-kpi-value ui-amount-income">{formatInr(snapshot.month_income)}</p>
            <p className="ui-kpi-help">This month</p>
          </Link>
          <Link
            className="ui-kpi-card"
            href={`/accounting/entries?entry_type=Expense&date_from=${snapshot.month_from}&date_to=${snapshot.month_to}`}
          >
            <p className="ui-kpi-label">Total Expense</p>
            <p className="ui-kpi-value ui-amount-expense">{formatInr(snapshot.month_expense)}</p>
            <p className="ui-kpi-help">This month</p>
          </Link>
          <Link className="ui-kpi-card" href="/reports/outstanding">
            <p className="ui-kpi-label">Outstanding Amount</p>
            <p className="ui-kpi-value">{formatInr(snapshot.outstanding)}</p>
            <p className="ui-kpi-help">All time</p>
          </Link>
        </div>
      </section>
      <section className="ui-section">
        <h2 className="ui-section-title">Current Account Balances</h2>
        <DataTable
          caption="Account balances"
          columns={[
            { key: "name", header: "Account", render: (row) => row.name },
            {
              key: "balance",
              header: "Current Balance",
              numeric: true,
              render: (row) => formatInr(row.current_balance),
            },
          ]}
          rows={snapshot.accounts}
          rowKey={(row) => row.id}
          emptyTitle="No accounts yet."
        />
      </section>
      <div className="ui-panel-grid">
        <section className="ui-section">
          <h2 className="ui-section-title">Recent Jobs</h2>
          <DataTable
            caption="Recent jobs"
            columns={[
              { key: "lot", header: "Lot Number", render: (row) => row.lot_number },
              { key: "party", header: "Party", render: (row) => row.party_name },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge tone={jobTone(row.status)} />,
              },
              { key: "date", header: "Date", render: (row) => formatDisplayDate(row.created_at) },
            ]}
            rows={snapshot.recent_jobs}
            rowKey={(row) => row.id}
            emptyTitle="No jobs yet."
          />
        </section>
        <section className="ui-section">
          <h2 className="ui-section-title">Recent Entries</h2>
          <DataTable
            caption="Recent entries"
            columns={[
              { key: "date", header: "Date", render: (row) => formatDisplayDate(row.entry_date) },
              {
                key: "type",
                header: "Type",
                render: (row) => <StatusBadge tone={row.entry_type === "Income" ? "income" : "expense"} />,
              },
              { key: "account", header: "Account", render: (row) => row.account_name },
              { key: "amount", header: "Amount", numeric: true, render: (row) => formatInr(row.amount) },
            ]}
            rows={snapshot.recent_entries}
            rowKey={(row) => row.id}
            emptyTitle="No entries yet."
          />
        </section>
      </div>
    </>
  );
}
