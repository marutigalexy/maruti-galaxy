"use client";

import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportButton } from "@/components/ui/export-button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useQueryPush } from "@/hooks/use-query-push";
import { queryHref } from "@/lib/api/query-href";
import type { Paginated } from "@/lib/api/pagination";
import { formatDisplayDate, formatInr, formatThan, formatWeightCt } from "@/lib/formatters";
import type { JobWorkReportInput } from "@/lib/validation/reports";
import type { PartyOption } from "@/services/parties/parties-service";
import type { JobWorkReportRow } from "@/services/reports/reports-service";

type JobWorkReportViewProps = {
  query: JobWorkReportInput;
  result: Paginated<JobWorkReportRow>;
  parties: PartyOption[];
};

function statusTone(status: JobWorkReportRow["status"]) {
  if (status === "Progress") {
    return "progress" as const;
  }
  if (status === "Completed") {
    return "completed" as const;
  }
  return "pending" as const;
}

function exportHref(query: JobWorkReportInput): string {
  return queryHref("/api/export/jobs", {
    search: query.search,
    status: query.status,
    job_type: query.job_type,
    party_id: query.party_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });
}

export function JobWorkReportView({ query, result, parties }: JobWorkReportViewProps) {
  const { pending: queryPending, push } = useQueryPush();
  const pushQuery = (next: JobWorkReportInput) => {
    push(queryHref("/reports/jobs", next));
  };
  const filtered =
    Boolean(query.search) ||
    query.status !== "all" ||
    query.job_type !== "all" ||
    Boolean(query.party_id) ||
    Boolean(query.date_from) ||
    Boolean(query.date_to);

  return (
    <>
      <FilterBar
        action={<ExportButton href={exportHref(query)} />}
        onReset={() =>
          pushQuery({
            search: "",
            status: "all",
            job_type: "all",
            party_id: undefined,
            date_from: undefined,
            date_to: undefined,
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <SearchInput
          id="report-job-lot"
          label="Lot Number"
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search lot number"
        />
        <FormField label="Job Type" htmlFor="report-job-type">
          <Select
            id="report-job-type"
            value={query.job_type}
            onChange={(event) =>
              pushQuery({ ...query, job_type: event.target.value as JobWorkReportInput["job_type"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="Sarin">Sarin</option>
            <option value="Dropping">Dropping</option>
            <option value="Galaxy">Galaxy</option>
          </Select>
        </FormField>
        <FormField label="Status" htmlFor="report-job-status">
          <Select
            id="report-job-status"
            value={query.status}
            onChange={(event) =>
              pushQuery({ ...query, status: event.target.value as JobWorkReportInput["status"], page: 1 })
            }
          >
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Progress">Progress</option>
            <option value="Completed">Completed</option>
          </Select>
        </FormField>
        <FormField label="Party" htmlFor="report-job-party">
          <Select
            id="report-job-party"
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
        <FormField label="Date From" htmlFor="report-job-from">
          <DatePicker
            id="report-job-from"
            value={query.date_from ?? ""}
            onChange={(event) => pushQuery({ ...query, date_from: event.target.value || undefined, page: 1 })}
          />
        </FormField>
        <FormField label="Date To" htmlFor="report-job-to">
          <DatePicker
            id="report-job-to"
            value={query.date_to ?? ""}
            onChange={(event) => pushQuery({ ...query, date_to: event.target.value || undefined, page: 1 })}
          />
        </FormField>
      </FilterBar>
      <DataTable
        caption="Job work report"
        columns={[
          { key: "lot", header: "Lot Number", render: (row) => row.lot_number },
          { key: "party", header: "Party", render: (row) => row.party_name },
          { key: "type", header: "Job Type", render: (row) => row.job_type },
          { key: "than", header: "Than", numeric: true, render: (row) => formatThan(row.than) },
          { key: "price", header: "Price", numeric: true, render: (row) => formatInr(row.price) },
          { key: "kapan", header: "Kapan", render: (row) => row.kapan_number },
          { key: "weight", header: "Weight", numeric: true, render: (row) => formatWeightCt(row.weight) },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge tone={statusTone(row.status)} />,
          },
          { key: "subs", header: "Sub Jobs", numeric: true, render: (row) => String(row.sub_job_count) },
          { key: "done", header: "Done Than", numeric: true, render: (row) => formatThan(row.done_than) },
          { key: "date", header: "Date", render: (row) => formatDisplayDate(row.created_at) },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        loading={queryPending}
        emptyTitle={filtered ? "No jobs match the selected filters." : "No jobs found."}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        disabled={queryPending}
        onPageChange={(page) => pushQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => pushQuery({ ...query, page: 1, pageSize })}
      />
    </>
  );
}
