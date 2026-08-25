"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addEmployeeWorkAction,
  advanceJobStageAction,
  createSubJobAction,
  deleteEmployeeWorkAction,
  updateEmployeeWorkAction,
  updateSubJobAction,
} from "@/app/actions/jobs";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { Card } from "@/components/ui/card";
import { ClientTabs } from "@/components/ui/client-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon, EyeIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import { getNextStage, normalizeStages } from "@/lib/validation/jobs";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { JobDetail, JobSubJobRecord, JobWorkRecord } from "@/services/jobs/jobs-service";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];

type JobDetailViewProps = {
  job: JobDetail;
  employees: EmployeeOption[];
};

function statusTone(status: string) {
  if (status === "Progress") {
    return "progress" as const;
  }
  if (status === "Completed") {
    return "completed" as const;
  }
  return "pending" as const;
}

export function JobDetailView({ job, employees }: JobDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [editSub, setEditSub] = useState<JobSubJobRecord | null>(null);
  const [workSub, setWorkSub] = useState<JobSubJobRecord | null>(null);
  const [editWork, setEditWork] = useState<JobWorkRecord | null>(null);
  const [deleteWork, setDeleteWork] = useState<JobWorkRecord | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [subThan, setSubThan] = useState("");
  const [subWeight, setSubWeight] = useState("");
  const [subStatus, setSubStatus] = useState<JobStatus>("Pending");
  const [editThan, setEditThan] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editStatus, setEditStatus] = useState<JobStatus>("Pending");
  const [expandedId, setExpandedId] = useState<string | null>(job.sub_jobs[0]?.id ?? null);
  const [workEmployeeId, setWorkEmployeeId] = useState("");
  const [workDoneThan, setWorkDoneThan] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "subjobs">("details");
  useRecordTitle(job.lot_number);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );

  const stages = useMemo(
    () => normalizeStages(job.stages ?? [job.job_type ?? "Sarin"]),
    [job.stages, job.job_type],
  );

  const nextStage = useMemo(
    () => getNextStage(stages, job.current_stage),
    [stages, job.current_stage],
  );

  const activeStage =
    (job.current_stage !== "Completed" ? job.current_stage : stages[stages.length - 1]) ?? "Sarin";
  const activeStageSubs = job.sub_jobs.filter((sub) => sub.stage === activeStage);
  const activeStageAllocated = activeStageSubs.reduce((sum, sub) => sum + sub.than, 0);
  const activeStageRemaining = Math.max(0, Math.round((job.than - activeStageAllocated) * 1000) / 1000);

  function handleOpenAddSubModal() {
    const remaining = Math.max(0, Math.floor(activeStageRemaining));
    setSubThan(remaining > 0 ? String(remaining) : "");
    setSubWeight("");
    setSubStatus("Pending");
    setSubOpen(true);
  }

  function handleOpenEditSubModal(sub: JobSubJobRecord) {
    setEditThan(String(Math.round(sub.than)));
    setEditWeight(String(sub.weight));
    setEditStatus(sub.status);
    setEditSub(sub);
  }

  const eligibleEmployees = useMemo(() => {
    if (!workSub) return [];
    const targetStage = workSub.stage ?? job.current_stage;
    return activeEmployees.filter((emp) => emp.employee_type === targetStage);
  }, [workSub, job.current_stage, activeEmployees]);

  const selectedEmployee = activeEmployees.find((employee) => employee.id === workEmployeeId);
  const workPreview =
    selectedEmployee && Number(workDoneThan) > 0
      ? Number(workDoneThan) * selectedEmployee.commission
      : null;

  const tabItems = [
    { id: "details", label: "Job Details" },
    { id: "subjobs", label: "Sub Jobs", count: job.sub_jobs.length },
  ] as const;

  function runMutation(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setFormError(null);
    startTransition(async () => {
      const outcome = await action();
      if (!outcome.ok) {
        setFormError(outcome.error?.message ?? "Unable to save.");
        toast.error(outcome.error?.message ?? "Unable to save.");
        return;
      }
      setSubOpen(false);
      setEditSub(null);
      setWorkSub(null);
      setEditWork(null);
      setDeleteWork(null);
      setAdvanceOpen(false);
      setWorkEmployeeId("");
      setWorkDoneThan("");
      toast.success(success);
      router.refresh();
    });
  }

  const isCompleted = job.status === "Completed" || job.current_stage === "Completed";
  const currentStageIndex = stages.indexOf(job.current_stage as (typeof stages)[number]);

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={statusTone(job.status)} />
      </TopbarStatus>
      <TopbarActions>
        {!isCompleted && (
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => setAdvanceOpen(true)}
          >
            {nextStage === "Completed"
              ? "Complete Job"
              : `Advance to ${nextStage}`}
          </Button>
        )}
        <IconButton
          tone="edit"
          label="Edit job"
          onClick={() => setEditJobOpen(true)}
        >
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>

      <div className="ui-detail-stack">
        {/* Stage Progress Stepper */}
        <section className="ui-section" aria-label="Job stage progression">
          <Card title="Stage Progression">
            <div className="ui-stage-stepper">
              {stages.map((stage, idx) => {
                const stageDone = isCompleted || (currentStageIndex > -1 && idx < currentStageIndex);
                const stageActive = !isCompleted && stage === job.current_stage;
                const stageUpcoming = !stageDone && !stageActive;

                let stepClass = "ui-stage-step";
                if (stageDone) stepClass += " is-completed";
                if (stageActive) stepClass += " is-active";
                if (stageUpcoming) stepClass += " is-upcoming";

                return (
                  <div key={stage} className={stepClass}>
                    <div className="ui-stage-indicator">
                      {stageDone ? "✓" : idx + 1}
                    </div>
                    <div className="ui-stage-meta">
                      <span className="ui-stage-step-title">{stage}</span>
                      <span className="ui-stage-step-status">
                        {stageDone ? "Completed" : stageActive ? "Active" : "Upcoming"}
                      </span>
                    </div>
                    {idx < stages.length - 1 && <div className="ui-stage-connector" />}
                  </div>
                );
              })}
              <div className="ui-stage-connector" />
              <div className={`ui-stage-step ${isCompleted ? "is-completed" : "is-upcoming"}`}>
                <div className="ui-stage-indicator">★</div>
                <div className="ui-stage-meta">
                  <span className="ui-stage-step-title">Completed</span>
                  <span className="ui-stage-step-status">
                    {isCompleted ? "Finished" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <ClientTabs
          items={tabItems}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Job details"
        />

        <div role="tabpanel" id="details-panel" aria-labelledby="details-tab" hidden={activeTab !== "details"}>
          <Card title="Job Details">
            <div className="ui-job-details-grid ui-job-details-grid-3">
              <section className="ui-job-details-column">
                <h3 className="ui-card-title">Basic Information</h3>
                <dl className="ui-property-list">
                  <div className="ui-detail-item">
                    <dt>Job Number</dt>
                    <dd>{job.lot_number}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Kapan Number</dt>
                    <dd>{job.kapan_number}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Party Name</dt>
                    <dd>{job.party_name}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Current Stage</dt>
                    <dd>
                      <JobTypeBadge type={job.current_stage} />
                    </dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Stages Pipeline</dt>
                    <dd>
                      <span className="ui-pipeline-text">{stages.join(" → ")}</span>
                    </dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Sub Jobs</dt>
                    <dd>{job.sub_jobs.length}</dd>
                  </div>
                </dl>
              </section>
              <section className="ui-job-details-column">
                <h3 className="ui-card-title">Quantity & Metrics</h3>
                <dl className="ui-property-list">
                  <div className="ui-detail-item">
                    <dt>Total Taan</dt>
                    <dd>{formatThan(job.than)}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Accepted Taan ({activeStage})</dt>
                    <dd>{formatThan(activeStageAllocated)}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Remaining Taan ({activeStage})</dt>
                    <dd>{formatThan(activeStageRemaining)}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Total Weight</dt>
                    <dd><WeightCt value={job.weight} /></dd>
                  </div>
                </dl>
              </section>
              <section className="ui-job-details-column">
                <h3 className="ui-card-title">Pricing & Billing</h3>
                <dl className="ui-property-list">
                  <div className="ui-detail-item">
                    <dt>Unit Price</dt>
                    <dd className="ui-price">{formatInr(job.price)}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Total Billing Amount</dt>
                    <dd className="ui-price">
                      {formatInr(
                        job.billing_amount != null
                          ? job.billing_amount
                          : Math.round(job.than * job.price * 100) / 100,
                      )}
                      {job.billing_amount == null ? (
                        <span className="ui-field-help" style={{ marginLeft: 4 }}>
                          (Than × Price)
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </Card>
        </div>

        <div role="tabpanel" id="subjobs-panel" aria-labelledby="subjobs-tab" hidden={activeTab !== "subjobs"}>
          <Card
            title="Sub Jobs"
            action={
              <AddButton
                size="sm"
                onClick={() => {
                  setFormError(null);
                  handleOpenAddSubModal();
                }}
              >
                Add Sub Job
              </AddButton>
            }
          >
            {job.sub_jobs.length === 0 ? (
              <p className="ui-field-help">No sub-jobs yet.</p>
            ) : (
              <div className="ui-subjob-list">
                {job.sub_jobs.map((sub) => {
                  const workExpanded = expandedId === sub.id;
                  const workPanelId = `subjob-work-${sub.id}`;

                  return (
                    <article key={sub.id} className="ui-subjob-card">
                      <div className="ui-subjob-header">
                        <div className="ui-subjob-heading">
                          <h3 className="ui-subjob-title">{sub.display_no}</h3>
                          <JobTypeBadge type={sub.stage} />
                          <StatusBadge tone={statusTone(sub.status)} />
                        </div>
                        <div className="ui-inline-actions">
                          <IconButton
                            label={workExpanded ? "Hide work" : "Show work"}
                            aria-expanded={workExpanded}
                            aria-controls={workExpanded ? workPanelId : undefined}
                            onClick={() =>
                              setExpandedId(workExpanded ? null : sub.id)
                            }
                          >
                            <EyeIcon width={16} height={16} />
                          </IconButton>
                          <IconButton
                            tone="edit"
                            label={`Edit ${sub.display_no}`}
                            onClick={() => {
                              setFormError(null);
                              handleOpenEditSubModal(sub);
                            }}
                          >
                            <EditIcon width={16} height={16} />
                          </IconButton>
                          <AddButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setFormError(null);
                              setWorkEmployeeId("");
                              setWorkDoneThan("");
                              setWorkSub(sub);
                            }}
                          >
                            Add Work
                          </AddButton>
                        </div>
                      </div>
                      <dl className="ui-summary-grid">
                        <div className="ui-detail-item">
                          <dt>Total Than</dt>
                          <dd>{formatThan(sub.than)}</dd>
                        </div>
                        <div className="ui-detail-item">
                          <dt>Done Than</dt>
                          <dd>{formatThan(sub.done_than)}</dd>
                        </div>
                        <div className="ui-detail-item">
                          <dt>Remaining Than</dt>
                          <dd>{formatThan(sub.remaining_than)}</dd>
                        </div>
                        <div className="ui-detail-item">
                          <dt>Weight</dt>
                          <dd>
                            <WeightCt value={sub.weight} />
                          </dd>
                        </div>
                      </dl>
                      {workExpanded ? (
                        <div id={workPanelId}>
                          <DataTable<JobWorkRecord>
                            caption={`${sub.display_no} work`}
                            emptyTitle="No employee work has been recorded for this sub-job yet."
                            rows={sub.work}
                            rowKey={(row) => row.id}
                            columns={[
                              {
                                key: "date",
                                header: "Date",
                                render: (row) =>
                                  formatDisplayDate(row.created_at),
                              },
                              {
                                key: "employee",
                                header: "Employee",
                                render: (row) => row.employee_name,
                              },
                              {
                                key: "than",
                                header: "Done Than",
                                numeric: true,
                                render: (row) => formatThan(row.done_than),
                              },
                              {
                                key: "commission",
                                header: "Commission",
                                numeric: true,
                                render: (row) => formatInr(row.commission),
                              },
                              {
                                key: "earning",
                                header: "Earning",
                                numeric: true,
                                render: (row) => formatInr(row.earning),
                              },
                              {
                                key: "actions",
                                header: "Actions",
                                render: (row) => (
                                  <TableActions>
                                    <IconButton
                                      tone="edit"
                                      label="Edit work"
                                      onClick={() => {
                                        setFormError(null);
                                        setEditWork(row);
                                      }}
                                    >
                                      <EditIcon width={16} height={16} />
                                    </IconButton>
                                    <IconButton
                                      tone="delete"
                                      label="Delete work"
                                      onClick={() => setDeleteWork(row)}
                                    >
                                      <DeleteIcon width={16} height={16} />
                                    </IconButton>
                                  </TableActions>
                                ),
                              },
                            ]}
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={editJobOpen}
        title={`Edit Job • ${job.lot_number}`}
        onClose={() => setEditJobOpen(false)}
        footer={null}
      >
        {editJobOpen ? (
          <JobEditForm job={job} onCancel={() => setEditJobOpen(false)} />
        ) : null}
      </Dialog>

      <Dialog
        open={subOpen}
        title="Add Sub Job"
        onClose={() => setSubOpen(false)}
        disableClose={pending}
        footer={null}
      >
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            runMutation(
              () =>
                createSubJobAction({
                  job_id: job.id,
                  than: subThan.trim(),
                  weight: subWeight.trim(),
                  stage: activeStage,
                  status: subStatus,
                }),
              "Sub-job created successfully.",
            );
          }}
        >
          <FormField
            label="Stage"
            htmlFor="create-sub-stage-display"
          >
            <div id="create-sub-stage-display" className="ui-field-control-row">
              <JobTypeBadge type={activeStage} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-primary-text)" }}>
                {activeStage} Stage
              </span>
            </div>
          </FormField>
          <FormField
            label="Than"
            htmlFor="create-sub-than"
            required
            help={`Remaining for ${activeStage}: ${Math.floor(activeStageRemaining)} (Total Job Than: ${formatThan(job.than)})`}
          >
            <Input
              id="create-sub-than"
              name="than"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required
              disabled={pending}
              placeholder={Math.floor(activeStageRemaining) > 0 ? String(Math.floor(activeStageRemaining)) : "e.g. 4"}
              value={subThan}
              onChange={(e) => setSubThan(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "e" || e.key === "E" || e.key === "-" || e.key === "+") {
                  e.preventDefault();
                }
              }}
            />
          </FormField>
          <FormField label="Weight" htmlFor="create-sub-weight" required>
            <Input
              id="create-sub-weight"
              name="weight"
              inputMode="decimal"
              autoComplete="off"
              required
              disabled={pending}
              value={subWeight}
              onChange={(e) => setSubWeight(e.target.value)}
              placeholder="e.g. 1.250"
            />
          </FormField>
          <FormField label="Status" htmlFor="create-sub-status" required>
            <Select
              id="create-sub-status"
              name="status"
              required
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value as JobStatus)}
              disabled={pending}
            >
              <option value="Pending">Pending</option>
              <option value="Progress">Progress</option>
              <option value="Completed">Completed</option>
            </Select>
          </FormField>
          {formError && subOpen ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setSubOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editSub)}
        title={editSub ? `Edit ${editSub.display_no}` : "Edit Sub Job"}
        onClose={() => setEditSub(null)}
        disableClose={pending}
        footer={null}
      >
        {editSub ? (
          <form
            className="ui-dialog-form"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              runMutation(
                () =>
                  updateSubJobAction({
                    id: editSub.id,
                    than: editThan.trim(),
                    weight: editWeight.trim(),
                    stage: editSub.stage,
                    status: editStatus,
                  }),
                "Sub-job updated successfully.",
              );
            }}
          >
            <FormField
              label="Stage"
              htmlFor="edit-sub-stage-display"
              help="Assigned stage for this sub-job"
            >
              <div id="edit-sub-stage-display" className="ui-field-control-row">
                <JobTypeBadge type={editSub.stage} />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-primary-text)" }}>
                  {editSub.stage} Stage
                </span>
              </div>
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
                disabled={pending}
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
                disabled={pending}
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
                disabled={pending}
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
                disabled={pending}
                onClick={() => setEditSub(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(workSub)}
        title={workSub ? `Add Work · ${workSub.display_no} (${workSub.stage})` : "Add Work"}
        onClose={() => setWorkSub(null)}
        disableClose={pending}
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
              );
            }}
          >
            <div className="ui-form-stage-notice">
              <span>Required Employee Type:</span>{" "}
              <JobTypeBadge type={workSub.stage} />
            </div>

            <FormField label="Employee" htmlFor="work-employee" required>
              <Select
                id="work-employee"
                name="employee_id"
                required
                disabled={pending || eligibleEmployees.length === 0}
                value={workEmployeeId}
                onChange={(event) => setWorkEmployeeId(event.target.value)}
              >
                <option value="">Select {workSub.stage} employee</option>
                {eligibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_type})
                  </option>
                ))}
              </Select>
            </FormField>

            {eligibleEmployees.length === 0 && (
              <p className="ui-field-error">
                No active {workSub.stage} employees available.{" "}
                <Link href="/employees">Add a {workSub.stage} employee</Link>
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
                disabled={pending}
                placeholder="e.g. 2.00"
                value={workDoneThan}
                onChange={(event) => setWorkDoneThan(event.target.value)}
              />
            </FormField>
            {workPreview != null ? (
              <p className="ui-field-help">
                Preview: Done Than × Commission = {formatInr(workPreview)}.
                Server value is final.
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
                disabled={pending}
                onClick={() => setWorkSub(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={eligibleEmployees.length === 0}>
                Add Work
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(editWork)}
        title="Edit Work"
        onClose={() => setEditWork(null)}
        disableClose={pending}
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
              );
            }}
          >
            <FormField label="Done Than" htmlFor="edit-work-done" required>
              <Input
                id="edit-work-done"
                name="done_than"
                inputMode="decimal"
                required
                defaultValue={String(editWork.done_than)}
                disabled={pending}
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
                disabled={pending}
                onClick={() => setEditWork(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteWork)}
        title="Delete Work?"
        description={
          deleteWork
            ? `This work record for ${deleteWork.employee_name} will be removed. Sub-job and job status may be recalculated.`
            : ""
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onCancel={() => setDeleteWork(null)}
        onConfirm={() => {
          if (!deleteWork) {
            return;
          }
          runMutation(
            () => deleteEmployeeWorkAction({ id: deleteWork.id }),
            "Work deleted successfully.",
          );
        }}
      />

      <ConfirmDialog
        open={advanceOpen}
        title={
          nextStage === "Completed"
            ? "Complete Job?"
            : `Advance Job to ${nextStage}?`
        }
        description={
          nextStage === "Completed"
            ? `Are you sure you want to complete the entire job (${job.lot_number})?`
            : `This will advance the job from "${job.current_stage}" stage to "${nextStage}" stage.`
        }
        confirmLabel={nextStage === "Completed" ? "Complete Job" : `Advance to ${nextStage}`}
        pending={pending}
        onCancel={() => setAdvanceOpen(false)}
        onConfirm={() => {
          runMutation(
            () => advanceJobStageAction({ job_id: job.id }),
            nextStage === "Completed"
              ? "Job marked as completed."
              : `Job advanced to ${nextStage} stage.`,
          );
        }}
      />
    </>
  );
}
