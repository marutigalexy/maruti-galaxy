"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";

import {
  addEmployeeWorkAction,
  deleteEmployeeWorkAction,
  deleteJobAction,
  deleteSubJobAction,
  getJobAction,
  updateEmployeeWorkAction,
  updateSubJobAction,
} from "@/app/actions/jobs";
import { JobCreateForm } from "@/components/jobs/job-create-form";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { SubJobDetailDialog } from "@/components/jobs/sub-job-detail-dialog";
import { AddButton } from "@/components/ui/add-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronDownIcon, DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
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
import type { ActionResult } from "@/lib/api/result";
import { formatInr, formatThan } from "@/lib/formatters";
import { normalizeStages, STAGE_ORDER, type ListJobsInput, type StageType } from "@/lib/validation/jobs";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type {
  JobDetail,
  JobListRecord,
  JobListSubJob,
  JobSubJobRecord,
  JobWorkRecord,
} from "@/services/jobs/jobs-service";
import type { PartyOption } from "@/services/parties/parties-service";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];

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
  if (query.job_type && query.job_type !== "all") {
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
  const [viewSubDetail, setViewSubDetail] = useState<{
    sub: JobSubJobRecord;
    lot_number: string;
  } | null>(null);
  const [editPending, startEdit] = useTransition();
  const [deleteJob, setDeleteJob] = useState<JobListRecord | null>(null);
  const [deleteSub, setDeleteSub] = useState<JobListSubJob | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Sub-job edit state
  const [editSub, setEditSub] = useState<JobSubJobRecord | null>(null);
  const [editStages, setEditStages] = useState<StageType[]>(["Sarin", "Dropping", "Galaxy"]);
  const [editCurrentStage, setEditCurrentStage] = useState<string>("Sarin");
  const [editThan, setEditThan] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editStatus, setEditStatus] = useState<JobStatus>("Pending");
  const [formError, setFormError] = useState<string | null>(null);

  // Work states
  const [workSub, setWorkSub] = useState<JobSubJobRecord | null>(null);
  const [workEmployeeId, setWorkEmployeeId] = useState("");
  const [workDoneThan, setWorkDoneThan] = useState("");
  const [editWork, setEditWork] = useState<JobWorkRecord | null>(null);
  const [deleteWork, setDeleteWork] = useState<JobWorkRecord | null>(null);

  const editSubPipeline = useMemo(() => normalizeStages(editStages), [editStages]);

  const eligibleEmployees = useMemo(() => {
    if (!workSub) return [];
    const targetStage = workSub.current_stage ?? workSub.stage ?? "Sarin";
    return employees.filter(
      (employee) => employee.is_active && employee.employee_type === targetStage,
    );
  }, [workSub, employees]);

  const selectedEmployee = useMemo(
    () => eligibleEmployees.find((employee) => employee.id === workEmployeeId),
    [eligibleEmployees, workEmployeeId],
  );

  const workPreview = useMemo(() => {
    if (!selectedEmployee || !workDoneThan) {
      return null;
    }
    const num = Number(workDoneThan);
    if (!Number.isFinite(num) || num <= 0) {
      return null;
    }
    return Math.round(num * selectedEmployee.commission * 100) / 100;
  }, [selectedEmployee, workDoneThan]);

  function toggleEditStage(stage: StageType) {
    if (editStages.includes(stage)) {
      if (editStages.length === 1) {
        toast.error("A sub-job must have at least one stage.");
        return;
      }
      const next = editStages.filter((s) => s !== stage);
      const nextNorm = normalizeStages(next);
      if (!nextNorm.includes(editCurrentStage as StageType) && editCurrentStage !== "Completed") {
        setEditCurrentStage(nextNorm[0] ?? "Sarin");
      }
      setEditStages(next);
    } else {
      setEditStages([...editStages, stage]);
    }
  }

  function handleOpenEditSub(sub: JobSubJobRecord) {
    const rawStages = sub.stages && sub.stages.length > 0 ? sub.stages : [sub.stage ?? "Sarin"];
    setEditStages(normalizeStages(rawStages));
    setEditCurrentStage(sub.current_stage ?? sub.stage ?? "Sarin");
    setEditThan(String(Math.round(sub.than)));
    setEditWeight(String(sub.weight));
    setEditStatus(sub.status);
    setFormError(null);
    setEditSub(sub);
  }

  const runMutation = (
    action: () => Promise<ActionResult<unknown>>,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
    startDeleteTransition(async () => {
      const outcome = await action();
      if (!outcome.ok) {
        toast.error(outcome.error.message);
        return;
      }
      toast.success(successMessage);
      onSuccess?.();
      router.refresh();
    });
  };

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

  function openSubDetail(jobId: string, subId: string) {
    startEdit(async () => {
      const outcome = await getJobAction({ id: jobId });
      if (!outcome.ok) {
        toast.error(outcome.error?.message ?? "Unable to load sub-job details.");
        return;
      }
      const found = outcome.data.sub_jobs.find((s) => s.id === subId);
      if (!found) {
        toast.error("Sub-job was not found.");
        return;
      }
      setViewSubDetail({ sub: found, lot_number: outcome.data.lot_number });
    });
  }

  function openEditSub(jobId: string, subId: string) {
    startEdit(async () => {
      const outcome = await getJobAction({ id: jobId });
      if (!outcome.ok) {
        toast.error(outcome.error?.message ?? "Unable to load sub-job details.");
        return;
      }
      const found = outcome.data.sub_jobs.find((s) => s.id === subId);
      if (!found) {
        toast.error("Sub-job was not found.");
        return;
      }
      handleOpenEditSub(found);
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
    (query.job_type && query.job_type !== "all") ||
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
              if (row.kind === "empty") {
                return null;
              }
              if (row.kind === "job") {
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
                    <IconButton
                      tone="delete"
                      label={`Delete ${row.job.lot_number}`}
                      disabled={deletePending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteJob(row.job);
                      }}
                    >
                      <DeleteIcon width={16} height={16} />
                    </IconButton>
                  </TableActions>
                );
              }
              if (row.kind === "sub") {
                return (
                  <TableActions>
                    <IconButton
                      tone="edit"
                      label={`Edit ${row.sub.display_no}`}
                      disabled={editPending || deletePending}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditSub(row.job.id, row.sub.id);
                      }}
                    >
                      <EditIcon width={16} height={16} />
                    </IconButton>
                    <IconButton
                      tone="delete"
                      label={`Delete ${row.sub.display_no}`}
                      disabled={deletePending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteSub(row.sub);
                      }}
                    >
                      <DeleteIcon width={16} height={16} />
                    </IconButton>
                  </TableActions>
                );
              }
              return null;
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
        getRowProps={(row: JobsTableRow) => {
          if (row.kind === "sub") {
            return { className: "is-nested ui-subjob-row is-clickable" };
          }
          if (row.kind === "empty") {
            return { className: "is-nested" };
          }
          return { className: "ui-job-row is-clickable" };
        }}
        onRowClick={(row) => {
          if (row.kind === "job") {
            router.push(`/jobs/${row.job.id}`);
          } else if (row.kind === "sub") {
            openSubDetail(row.job.id, row.sub.id);
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

      {/* Edit Sub Job Modal */}
      <Dialog
        open={Boolean(editSub)}
        title={editSub ? `Edit Sub-Job • ${editSub.display_no}` : "Edit Sub-Job"}
        onClose={() => setEditSub(null)}
        disableClose={deletePending}
        footer={null}
      >
        {editSub ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (editStages.length === 0) {
                setFormError("Please select at least one stage.");
                return;
              }
              runMutation(
                () =>
                  updateSubJobAction({
                    id: editSub.id,
                    than: editThan.trim(),
                    weight: editWeight.trim(),
                    stages: editSubPipeline,
                    current_stage: editCurrentStage,
                    status: editStatus,
                  }),
                "Sub-job updated successfully.",
                () => {
                  setEditSub(null);
                  if (viewSubDetail && viewSubDetail.sub.id === editSub.id) {
                    setViewSubDetail(null);
                  }
                },
              );
            }}
          >
            <div className="ui-form-field ui-job-form-full">
              <label className="ui-form-label">
                Production Pipeline Stages <span className="ui-required-mark">*</span>
              </label>
              <div className="ui-stage-checkbox-group" role="group" aria-label="Select pipeline stages">
                {STAGE_ORDER.map((stage) => {
                  const isChecked = editStages.includes(stage);
                  return (
                    <label
                      key={stage}
                      className={`ui-stage-checkbox-label ${isChecked ? "is-selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="ui-stage-checkbox"
                        checked={isChecked}
                        disabled={deletePending}
                        onChange={() => toggleEditStage(stage)}
                      />
                      <span className="ui-stage-name">{stage}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <FormField label="Current Active Stage" htmlFor="edit-sub-current-stage" required>
              <Select
                id="edit-sub-current-stage"
                name="current_stage"
                required
                disabled={deletePending}
                value={editCurrentStage}
                onChange={(event) => setEditCurrentStage(event.target.value)}
              >
                {editSubPipeline.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
                <option value="Completed">Completed</option>
              </Select>
            </FormField>

            <FormField label="Than" htmlFor="edit-sub-than" required>
              <Input
                id="edit-sub-than"
                name="than"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                required
                value={editThan}
                onChange={(e) => setEditThan(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={deletePending}
                placeholder="e.g. 4"
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "e" || e.key === "E" || e.key === "-" || e.key === "+") {
                    e.preventDefault();
                  }
                }}
              />
            </FormField>
            <FormField label="Weight" htmlFor="edit-sub-weight" required>
              <Input
                id="edit-sub-weight"
                name="weight"
                inputMode="decimal"
                required
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                disabled={deletePending}
                placeholder="e.g. 1.250"
              />
            </FormField>
            <FormField label="Status" htmlFor="edit-sub-status" required>
              <Select
                id="edit-sub-status"
                name="status"
                required
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as JobStatus)}
                disabled={deletePending}
              >
                <option value="Pending">Pending</option>
                <option value="Progress">Progress</option>
                <option value="Completed">Completed</option>
              </Select>
            </FormField>
            {formError && editSub ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button
                variant="secondary"
                disabled={deletePending}
                onClick={() => setEditSub(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={deletePending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* Add Work Modal */}
      <Dialog
        open={Boolean(workSub)}
        title={workSub ? `Add Work · ${workSub.display_no} (${workSub.current_stage})` : "Add Work"}
        onClose={() => setWorkSub(null)}
        disableClose={deletePending}
        footer={null}
      >
        {workSub ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  addEmployeeWorkAction({
                    sub_job_id: workSub.id,
                    employee_id: String(form.get("employee_id") ?? ""),
                    done_than: String(form.get("done_than") ?? ""),
                  }),
                "Work recorded successfully.",
                () => {
                  setWorkSub(null);
                  if (viewSubDetail && viewSubDetail.sub.id === workSub.id) {
                    setViewSubDetail(null);
                  }
                },
              );
            }}
          >
            <div className="ui-form-stage-notice">
              <span>Required Employee Type:</span>{" "}
              <JobTypeBadge type={workSub.current_stage} />
            </div>

            <FormField label="Employee" htmlFor="work-employee" required>
              <Select
                id="work-employee"
                name="employee_id"
                required
                disabled={deletePending || eligibleEmployees.length === 0}
                value={workEmployeeId}
                onChange={(event) => setWorkEmployeeId(event.target.value)}
              >
                <option value="">Select {workSub.current_stage} employee</option>
                {eligibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_type})
                  </option>
                ))}
              </Select>
            </FormField>

            {eligibleEmployees.length === 0 && (
              <p className="ui-field-error">
                No active {workSub.current_stage} employees available.{" "}
                <Link href="/employees">Add a {workSub.current_stage} employee</Link>
              </p>
            )}

            {selectedEmployee ? (
              <p className="ui-field-help">
                Current commission {formatInr(selectedEmployee.commission)} per Than.
              </p>
            ) : null}
            <FormField label="Done Than" htmlFor="work-done" required>
              <Input
                id="work-done"
                name="done_than"
                inputMode="decimal"
                required
                disabled={deletePending}
                placeholder="e.g. 2.00"
                value={workDoneThan}
                onChange={(event) => setWorkDoneThan(event.target.value)}
              />
            </FormField>
            {workPreview != null ? (
              <p className="ui-field-help">
                Preview: Done Than × Commission = {formatInr(workPreview)}.
              </p>
            ) : null}
            {formError && workSub ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button
                variant="secondary"
                disabled={deletePending}
                onClick={() => setWorkSub(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={deletePending} disabled={eligibleEmployees.length === 0}>
                Add Work
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* Edit Work Modal */}
      <Dialog
        open={Boolean(editWork)}
        title="Edit Work"
        onClose={() => setEditWork(null)}
        disableClose={deletePending}
        footer={null}
      >
        {editWork ? (
          <form
            className="ui-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateEmployeeWorkAction({
                    id: editWork.id,
                    done_than: String(form.get("done_than") ?? ""),
                  }),
                "Work updated successfully.",
                () => {
                  setEditWork(null);
                  if (viewSubDetail) {
                    setViewSubDetail(null);
                  }
                },
              );
            }}
          >
            <div className="ui-form-stage-notice">
              <span>Work Stage:</span>{" "}
              <JobTypeBadge type={editWork.stage} />
            </div>
            <FormField label="Done Than" htmlFor="edit-work-done" required>
              <Input
                id="edit-work-done"
                name="done_than"
                inputMode="decimal"
                required
                defaultValue={String(editWork.done_than)}
                disabled={deletePending}
                placeholder="e.g. 2.00"
              />
            </FormField>
            {formError && editWork ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button
                variant="secondary"
                disabled={deletePending}
                onClick={() => setEditWork(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={deletePending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* Delete Work Dialog */}
      <ConfirmDialog
        open={Boolean(deleteWork)}
        title="Delete Work?"
        description={
          deleteWork
            ? `This work record for ${deleteWork.employee_name} (${deleteWork.stage}) will be removed. Sub-job and job status may be recalculated.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={deletePending}
        onCancel={() => setDeleteWork(null)}
        onConfirm={() => {
          if (!deleteWork) return;
          runMutation(
            () => deleteEmployeeWorkAction({ id: deleteWork.id }),
            "Work deleted successfully.",
            () => {
              setDeleteWork(null);
              if (viewSubDetail) {
                setViewSubDetail(null);
              }
            },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteJob)}
        title="Delete Job?"
        description={
          deleteJob
            ? `Are you sure you want to delete Job "${deleteJob.lot_number}"? This will permanently delete the job, its sub-jobs, and all associated work records. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Job"
        danger
        pending={deletePending}
        onCancel={() => setDeleteJob(null)}
        onConfirm={() => {
          if (!deleteJob) return;
          runMutation(
            () => deleteJobAction({ id: deleteJob.id }),
            "Job deleted successfully.",
            () => setDeleteJob(null),
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteSub)}
        title="Delete Sub-Job?"
        description={
          deleteSub
            ? `Are you sure you want to delete Sub-Job "${deleteSub.display_no}"? This will permanently delete this sub-job and all its work records. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Sub-Job"
        danger
        pending={deletePending}
        onCancel={() => setDeleteSub(null)}
        onConfirm={() => {
          if (!deleteSub) return;
          runMutation(
            () => deleteSubJobAction({ id: deleteSub.id }),
            "Sub-job deleted successfully.",
            () => setDeleteSub(null),
          );
        }}
      />

      {/* Sub-Job Details Dialog */}
      {viewSubDetail && (
        <SubJobDetailDialog
          open={Boolean(viewSubDetail)}
          subJob={viewSubDetail.sub}
          lotNumber={viewSubDetail.lot_number}
          onClose={() => setViewSubDetail(null)}
          pending={deletePending || editPending}
          onEdit={(sub) => handleOpenEditSub(sub)}
          onDelete={(sub) => {
            setViewSubDetail(null);
            setDeleteSub(sub);
          }}
          onAddWork={(sub) => {
            setWorkEmployeeId("");
            setWorkDoneThan("");
            setWorkSub(sub);
          }}
          onEditWork={(work) => setEditWork(work)}
          onDeleteWork={(work) => setDeleteWork(work)}
        />
      )}
    </>
  );
}
