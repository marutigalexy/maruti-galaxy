import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { EmployeeRecord, EmployeeSummary } from "@/services/employees/employees-service";

type EmployeeDetailViewProps = {
  employee: EmployeeRecord;
  summary: EmployeeSummary;
};

export function EmployeeDetailView({ employee, summary }: EmployeeDetailViewProps) {
  return (
    <>
      <PageHeader
        title={employee.name}
        description="Employee information and work history. Historical commission is snapshotted on each work row."
      />
      <p className="ui-field-help">
        <Link href="/employees">Back to Employees</Link>
      </p>
      <dl className="ui-detail-grid">
        <div className="ui-detail-item">
          <dt>Name</dt>
          <dd>{employee.name}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Mobile Number</dt>
          <dd>{employee.mobile_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Current Commission</dt>
          <dd>{formatInr(employee.commission)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Status</dt>
          <dd>
            <StatusBadge tone={employee.is_active ? "active" : "inactive"} />
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Done Than</dt>
          <dd>{formatThan(summary.total_done_than)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Total Earning</dt>
          <dd>{formatInr(summary.total_earning)}</dd>
        </div>
      </dl>
      <p className="ui-field-help">
        Historical work keeps the commission used at the time of recording. Changing the current
        commission does not rewrite past work or earnings.
      </p>
      <section className="ui-section">
        <h2 className="ui-section-title">Work History</h2>
        <DataTable
          caption="Work history"
          columns={[
            {
              key: "lot",
              header: "Lot / Sub Job",
              render: (row) => row.display_no ?? row.lot_number ?? "—",
            },
            {
              key: "date",
              header: "Date",
              render: (row) => formatDisplayDate(row.created_at),
            },
            { key: "than", header: "Done Than", numeric: true, render: (row) => String(row.done_than) },
            {
              key: "commission",
              header: "Commission (snapshot)",
              numeric: true,
              render: (row) => formatInr(row.commission),
            },
            { key: "earning", header: "Earning", numeric: true, render: (row) => formatInr(row.earning) },
          ]}
          rows={summary.work}
          rowKey={(row) => row.id}
          emptyTitle="No work has been recorded for this employee yet."
        />
      </section>
    </>
  );
}
