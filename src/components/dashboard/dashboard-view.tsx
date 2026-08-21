import Link from "next/link";

import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { DashboardSnapshot } from "@/services/dashboard/dashboard-service";

type DashboardViewProps = {
  snapshot: DashboardSnapshot;
};

// ── helpers ────────────────────────────────────────────────────────────────

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function jobStatusBadge(status: string) {
  if (status === "Progress") {
    return <span className="db-badge db-badge-progress">In Progress</span>;
  }
  if (status === "Completed") {
    return <span className="db-badge db-badge-completed">Completed</span>;
  }
  return <span className="db-badge db-badge-pending">Pending</span>;
}

function entryTypeBadge(type: string) {
  if (type === "Expense") {
    return <span className="db-badge db-badge-expense">Expense</span>;
  }
  return <span className="db-badge db-badge-income">Income</span>;
}

function accountInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ── component ──────────────────────────────────────────────────────────────

export function DashboardView({ snapshot }: DashboardViewProps) {
  const {
    jobs_total,
    jobs_pending,
    jobs_progress,
    jobs_completed,
    total_than,
    employee_earnings,
    month_income,
    month_expense,
    outstanding,
    month_from,
    month_to,
    accounts,
    recent_jobs,
    recent_entries,
  } = snapshot;

  return (
    <div className="db-page">

      {/* ── Job KPIs ─────────────────────────────────────────────────── */}
      <div className="db-grid db-jobs-grid">
        <Link href="/jobs" className="db-kpi db-kpi-blue">
          <div className="db-kpi-label">Total Jobs</div>
          <div className="db-kpi-value">{jobs_total}</div>
          <div className="db-kpi-helper">
            All time · <b className="db-text-blue">100% tracked</b>
          </div>
        </Link>

        <Link href="/jobs?status=Pending" className="db-kpi db-kpi-orange">
          <div className="db-kpi-label">Pending Jobs</div>
          <div className="db-kpi-value">{jobs_pending}</div>
          <div className="db-kpi-helper">
            <b className="db-text-orange">{pct(jobs_pending, jobs_total)}</b> of total jobs
          </div>
        </Link>

        <Link href="/jobs?status=Progress" className="db-kpi db-kpi-purple">
          <div className="db-kpi-label">Progress Jobs</div>
          <div className="db-kpi-value">{jobs_progress}</div>
          <div className="db-kpi-helper">
            <b className="db-text-purple">{jobs_progress} active</b> right now
          </div>
        </Link>

        <Link href="/jobs?status=Completed" className="db-kpi db-kpi-green">
          <div className="db-kpi-label">Completed Jobs</div>
          <div className="db-kpi-value">{jobs_completed}</div>
          <div className="db-kpi-helper">
            <b className="db-text-green">{pct(jobs_completed, jobs_total)}</b> completion rate
          </div>
        </Link>
      </div>

      {/* ── Financial KPIs ───────────────────────────────────────────── */}
      <div className="db-section-title">Financial overview</div>

      <div className="db-grid db-finance-grid">
        <Link href="/jobs" className="db-kpi db-kpi-blue db-kpi-finance">
          <div className="db-kpi-label">Total Than</div>
          <div className="db-kpi-value">{formatThan(total_than)}</div>
          <div className="db-kpi-helper">
            All jobs · <b className="db-text-blue">{jobs_total} lots</b>
          </div>
          <div className="db-decor-line db-decor-blue"><span /></div>
        </Link>

        <Link href="/reports/salary" className="db-kpi db-kpi-purple db-kpi-finance">
          <div className="db-kpi-label">Employee Earnings</div>
          <div className="db-kpi-value">{formatInr(employee_earnings)}</div>
          <div className="db-kpi-helper">All time work</div>
          <div className="db-decor-line db-decor-purple"><span /></div>
        </Link>

        <Link
          href={`/accounting/entries?entry_type=Income&date_from=${month_from}&date_to=${month_to}`}
          className="db-kpi db-kpi-green db-kpi-finance"
        >
          <div className="db-kpi-label">Total Income</div>
          <div className="db-kpi-value">{formatInr(month_income)}</div>
          <div className="db-kpi-helper">
            <b className="db-text-green">This month</b> · cash received
          </div>
          <div className="db-decor-line db-decor-green"><span /></div>
        </Link>

        <Link
          href={`/accounting/entries?entry_type=Expense&date_from=${month_from}&date_to=${month_to}`}
          className="db-kpi db-kpi-orange db-kpi-finance"
        >
          <div className="db-kpi-label">Total Expense</div>
          <div className="db-kpi-value">{formatInr(month_expense)}</div>
          <div className="db-kpi-helper">
            <b className="db-text-orange">This month</b> · low spend
          </div>
          <div className="db-decor-line db-decor-orange"><span /></div>
        </Link>

        <Link href="/reports/outstanding" className="db-kpi db-kpi-blue db-kpi-finance">
          <div className="db-kpi-label">Outstanding Amount</div>
          <div className="db-kpi-value">{formatInr(outstanding)}</div>
          <div className="db-kpi-helper">
            <b className="db-text-blue">All time</b> · awaiting collection
          </div>
          <div className="db-decor-line db-decor-blue"><span /></div>
        </Link>
      </div>

      {/* ── Account Balances ─────────────────────────────────────────── */}
      <div className="db-section-title">Current Account Balances</div>

      <div className="db-accounts-card">
        <div className="db-accounts-head">
          <span>Account</span>
          <span>Current balance</span>
        </div>
        {accounts.length === 0 ? (
          <div className="db-accounts-empty">No accounts yet.</div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="db-account-row">
              <div className="db-account-info">
                <div className="db-account-icon">{accountInitial(account.name)}</div>
                <div>
                  <div className="db-account-name">{account.name}</div>
                </div>
              </div>
              <div className="db-account-balance">{formatInr(account.current_balance)}</div>
            </div>
          ))
        )}
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────── */}
      <div className="db-section-title">Recent activity</div>

      <div className="db-lower-grid">

        {/* Recent Jobs */}
        <div className="db-table-card">
          <div className="db-table-head">
            <span className="db-table-title">Recent Jobs</span>
            <Link href="/jobs" className="db-view-all">View all →</Link>
          </div>
          <table className="db-table">
            <thead>
              <tr>
                <th>Lot Number</th>
                <th>Party</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent_jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="db-table-empty">No jobs yet.</td>
                </tr>
              ) : (
                recent_jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="db-lot">{job.lot_number}</td>
                    <td className="db-party">{job.party_name}</td>
                    <td>{jobStatusBadge(job.status)}</td>
                    <td>{formatDisplayDate(job.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Entries */}
        <div className="db-table-card">
          <div className="db-table-head">
            <span className="db-table-title">Recent Entries</span>
            <Link href="/accounting/entries" className="db-view-all">View all →</Link>
          </div>
          <table className="db-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Account</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent_entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="db-table-empty">No entries yet.</td>
                </tr>
              ) : (
                recent_entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDisplayDate(entry.entry_date)}</td>
                    <td>{entryTypeBadge(entry.entry_type)}</td>
                    <td>{entry.account_name}</td>
                    <td className="db-amount">{formatInr(entry.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
