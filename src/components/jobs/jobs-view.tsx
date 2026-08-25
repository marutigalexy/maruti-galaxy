"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent } from "react";

import { getJobAction } from "@/app/actions/jobs";
import { JobCreateForm } from "@/components/jobs/job-create-form";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { AddButton } from "@/components/ui/add-button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronDownIcon, EditIcon } from "@/components/ui/icons";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { useQueryPush } from "@/hooks/use-query-push";
import type { Paginated } from "@/lib/api/pagination";
import { formatInr, formatThan } from "@/lib/formatters";
import type { ListJobsInput } from "@/lib/validation/jobs";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { JobDetail, JobListRecord, JobListSubJob } from "@/services/jobs/jobs-service";
import type { PartyOption } from "@/services/parties/parties-service";

type JobsViewProps = {
  query: ListJobsInput;
  result: Paginated<JobListRecord>;
  parties: PartyOption[];
  employees: EmployeeOption[];
};

type JobsTableRow =
  | { kind: "job"; job: JobListRecord }
  | { kind: "sub"; job: JobListRecord; sub: JobListSubJob }
  | { kind: "empty"; job: JobListRecord };

function jobsHref(query: ListJobsInput): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.stage && query.stage !== "all") {
    params.set("stage", query.stage);
  } else if (query.job_type !== "all") {
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const needle = query.search.trim().toLowerCase();
    if (!needle) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const job of result.records) {
          if (
            !next.has(job.id) &&
            job.sub_jobs.some((sub) => sub.display_no.toLowerCase().includes(needle))
          ) {
            next.add(job.id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [query.search, result.records]);

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

  function toggleExpanded(event: MouseEvent<HTMLButtonElement>, jobId: string) {
    event.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }

  const filteredEmpty =
    Boolean(query.search) ||
    query.status !== "all" ||
    query.job_type !== "all" ||
    (query.stage && query.stage !== "all") ||
    Boolean(query.party_id) ||
    Boolean(query.employee_id);

  const rows = result.records.flatMap((job): JobsTableRow[] => {
    const parent: JobsTableRow = { kind: "job", job };
    if (!expandedIds.has(job.id)) {
      return [parent];
    }
    if (job.sub_jobs.length === 0) {
      return [parent, { kind: "empty", job }];
    }
    return [parent, ...job.sub_jobs.map((sub): JobsTableRow => ({ kind: "sub", job, sub }))];
  });

  return (
    <>
      <FilterBar
        action={<AddButton onClick={() => setCreateOpen(true)}>Add Job</AddButton>}
        onReset={() =>
          pushQuery({
            search: "",
            status: "all",
            job_type: "all",
            stage: "all",
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
        <FormField
          label="Stage"
          htmlFor="job-stage-filter"
        >
          <Select
            id="job-stage-filter"
            value={query.stage ?? query.job_type ?? "all"}
            onChange={(event) =>
              pushQuery({
                ...query,
                stage: event.target.value as ListJobsInput["stage"],
                job_type: "all",
                page: 1,
              })
            }
          >
            <option value="all">All Stages</option>
            <option value="Sarin">Sarin</option>
            <option value="Dropping">Dropping</option>
            <option value="Galaxy">Galaxy</option>
            <option value="Completed">Completed</option>
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
          {
            key: "expand",
            header: "",
            render: (row) => {
              if (row.kind !== "job") {
                return null;
              }
              const expanded = expandedIds.has(row.job.id);
              return (
                <IconButton
                  className="ui-table-expand"
                  label={expanded ? "Hide sub-jobs" : "Show sub-jobs"}
                  aria-expanded={expanded}
                  onClick={(event) => toggleExpanded(event, row.job.id)}
                >
                  <ChevronDownIcon
                    className={["ui-table-expand-icon", expanded ? "is-open" : "is-closed"].join(" ")}
                    width={16}
                    height={16}
                  />
                </IconButton>
              );
            },
          },
          {
            key: "lot",
            header: "Lot Number",
            render: (row) => {
              if (row.kind === "sub") {
                return <span className="ui-table-nested-label">{row.sub.display_no}</span>;
              }
              if (row.kind === "empty") {
                return <span className="ui-table-nested-label is-muted">No sub-jobs</span>;
              }
              return row.job.lot_number;
            },
          },
          {
            key: "party",
            header: "Party",
            render: (row) => (row.kind === "job" ? row.job.party_name : "—"),
          },
          {
            key: "stage",
            header: "Current Stage",
            render: (row) => {
              if (row.kind === "job") {
                return <JobTypeBadge type={row.job.current_stage} />;
              }
              if (row.kind === "sub") {
                return <JobTypeBadge type={row.sub.stage} />;
              }
              return "—";
            },
          },
          {
            key: "than",
            header: "Than",
            numeric: true,
            render: (row) => {
              if (row.kind === "empty") {
                return "";
              }
              const value = formatThan(row.kind === "job" ? row.job.than : row.sub.than);
              return <strong>{value}</strong>;
            },
          },
          {
            key: "remaining",
            header: "Remaining Than",
            numeric: true,
            render: (row) => {
              if (row.kind === "empty") {
                return "";
              }
              const value = formatThan(row.kind === "job" ? row.job.remaining_than : row.sub.remaining_than);
              return <strong>{value}</strong>;
            },
          },
          {
            key: "weight",
            header: "Weight",
            numeric: true,
            render: (row) => {
              if (row.kind === "empty") {
                return "";
              }
              return <WeightCt value={row.kind === "job" ? row.job.weight : row.sub.weight} />;
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row) => {
              if (row.kind === "empty") {
                return "";
              }
              const status = row.kind === "job" ? row.job.status : row.sub.status;
              return <StatusBadge tone={statusTone(status)} />;
            },
          },
          {
            key: "price",
            header: "Price",
            numeric: true,
            render: (row) => (row.kind === "job" ? <span className="ui-price">{formatInr(row.job.price)}</span> : "—"),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => {
              if (row.kind !== "job") {
                return null;
              }
              return (
                <TableActions>
                  <IconButton
                    tone="edit"
                    label={`Edit ${row.job.lot_number}`}
                    disabled={editPending && editJobId === row.job.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(row.job.id);
                    }}
                  >
                    <EditIcon width={16} height={16} />
                  </IconButton>
                </TableActions>
              );
            },
          },
        ]}
        rows={rows}
        rowKey={(row) => {
          if (row.kind === "job") {
            return row.job.id;
          }
          if (row.kind === "sub") {
            return `sub-${row.sub.id}`;
          }
          return `empty-${row.job.id}`;
        }}
        getRowProps={(row: JobsTableRow) => ({
          className: row.kind === "job" ? "is-clickable" : "is-nested",
        })}
        onRowClick={(row) => {
          if (row.kind === "job") {
            router.push(`/jobs/${row.job.id}`);
          }
        }}
        loading={queryPending}
        emptyTitle={
          filteredEmpty
            ? "No jobs match the selected filters."
            : "No jobs have been added yet."
        }
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
        {createOpen ? (
          <JobCreateForm
            parties={parties}
            onCancel={() => setCreateOpen(false)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(editJob)}
        title={editJob ? `Edit Job • ${editJob.lot_number}` : "Edit Job"}
        onClose={() => setEditJob(null)}
        footer={null}
      >
        {editJob ? (
          <JobEditForm job={editJob} onCancel={() => setEditJob(null)} />
        ) : null}
      </Dialog>
    </>
  );
}
