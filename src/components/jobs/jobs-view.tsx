"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getJobAction } from "@/app/actions/jobs";
import { JobCreateForm } from "@/components/jobs/job-create-form";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import { AddButton } from "@/components/ui/add-button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import type { Paginated } from "@/lib/api/pagination";
import { formatInr, formatThan, formatWeightCt } from "@/lib/formatters";
import type { ListJobsInput } from "@/lib/validation/jobs";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { JobDetail, JobListRecord } from "@/services/jobs/jobs-service";
import type { PartyOption } from "@/services/parties/parties-service";

type JobsViewProps = {
  query: ListJobsInput;
  result: Paginated<JobListRecord>;
  parties: PartyOption[];
  employees: EmployeeOption[];
};

function jobsHref(query: ListJobsInput): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.job_type !== "all") {
    params.set("job_type", query.job_type);
  }
  if (query.party_id) {
    params.set("party_id", query.party_id);
  }
  if (query.employee_id) {
    params.set("employee_id", query.employee_id);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

function statusTone(status: JobListRecord["status"]) {
  if (status === "Progress") {
    return "progress" as const;
  }
  if (status === "Completed") {
    return "completed" as const;
  }
  return "pending" as const;
}

export function JobsView({ query, result, parties, employees }: JobsViewProps) {
  const router = useRouter();
  const { pending: queryPending, push } = useQueryPush();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobDetail | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [editPending, startEdit] = useTransition();

  const pushQuery = (next: ListJobsInput) => {
    push(jobsHref(next));
  };

  function openEdit(jobId: string) {
    startEdit(async () => {
      setEditJobId(jobId);
      const outcome = await getJobAction({ id: jobId });
      setEditJobId(null);
      if (!outcome.ok) {
        toast.error(outcome.error?.message ?? "Unable to load job.");
        return;
      }
      setEditJob(outcome.data);
    });
  }

  const filteredEmpty =
    Boolean(query.search) ||
    query.status !== "all" ||
    query.job_type !== "all" ||
    Boolean(query.party_id) ||
    Boolean(query.employee_id);

  return (
    <>
      <FilterBar
        action={<AddButton onClick={() => setCreateOpen(true)}>Add Job</AddButton>}
        onReset={() =>
          pushQuery({
            search: "",
            status: "all",
            job_type: "all",
            party_id: undefined,
            employee_id: undefined,
            page: 1,
            pageSize: query.pageSize,
          })
        }
      >
        <SearchInput
          value={query.search}
          onValueChange={(search) => pushQuery({ ...query, search, page: 1 })}
          placeholder="Search lot or sub-job (J01, J01-A)"
        />
        <FormField label="Job Type" htmlFor="job-type-filter">
          <Select
            id="job-type-filter"
            value={query.job_type}
            onChange={(event) =>
              pushQuery({
                ...query,
                job_type: event.target.value as ListJobsInput["job_type"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="Sarin">Sarin</option>
            <option value="Dropping">Dropping</option>
            <option value="Galaxy">Galaxy</option>
          </Select>
        </FormField>
        <FormField label="Status" htmlFor="job-status-filter">
          <Select
            id="job-status-filter"
            value={query.status}
            onChange={(event) =>
              pushQuery({
                ...query,
                status: event.target.value as ListJobsInput["status"],
                page: 1,
              })
            }
          >
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Progress">Progress</option>
            <option value="Completed">Completed</option>
          </Select>
        </FormField>
        <FormField label="Party" htmlFor="job-party-filter">
          <Select
            id="job-party-filter"
            value={query.party_id ?? ""}
            onChange={(event) =>
              pushQuery({
                ...query,
                party_id: event.target.value || undefined,
                page: 1,
              })
            }
          >
            <option value="">All</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.company_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Employee" htmlFor="job-employee-filter">
          <Select
            id="job-employee-filter"
            value={query.employee_id ?? ""}
            onChange={(event) =>
              pushQuery({
                ...query,
                employee_id: event.target.value || undefined,
                page: 1,
              })
            }
          >
            <option value="">All</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        caption="Jobs"
        columns={[
          { key: "lot", header: "Lot Number", render: (row) => row.lot_number },
          { key: "party", header: "Party", render: (row) => row.party_name },
          { key: "type", header: "Job Type", render: (row) => row.job_type },
          { key: "than", header: "Than", numeric: true, render: (row) => formatThan(row.than) },
          {
            key: "remaining",
            header: "Remaining Than",
            numeric: true,
            render: (row) => formatThan(row.remaining_than),
          },
          { key: "weight", header: "Weight", numeric: true, render: (row) => formatWeightCt(row.weight) },
          { key: "price", header: "Price", numeric: true, render: (row) => formatInr(row.price) },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge tone={statusTone(row.status)} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <TableActions>
                {row.invoice_id ? <InvoicePrintButton variant="icon" invoiceId={row.invoice_id} /> : null}
                <IconButton
                  tone="edit"
                  label="Edit job"
                  loading={editPending && editJobId === row.id}
                  disabled={editPending}
                  onClick={() => openEdit(row.id)}
                >
                  <EditIcon width={16} height={16} />
                </IconButton>
              </TableActions>
            ),
          },
        ]}
        rows={result.records}
        rowKey={(row) => row.id}
        loading={queryPending}
        onRowClick={(row) => router.push(`/jobs/${row.id}`)}
        emptyTitle={filteredEmpty ? "No jobs match the selected filters." : "No jobs found."}
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
      <Dialog
        open={createOpen}
        title="Add Job"
        onClose={() => setCreateOpen(false)}
        footer={null}
      >
        {createOpen ? <JobCreateForm parties={parties} onCancel={() => setCreateOpen(false)} /> : null}
      </Dialog>
      <Dialog
        open={Boolean(editJob)}
        title="Edit Job"
        onClose={() => setEditJob(null)}
        footer={null}
      >
        {editJob ? <JobEditForm job={editJob} onCancel={() => setEditJob(null)} /> : null}
      </Dialog>
    </>
  );
}
