"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addEmployeeWorkAction,
  createSubJobAction,
  deleteEmployeeWorkAction,
  deleteJobAction,
  deleteSubJobAction,
  updateEmployeeWorkAction,
  updateSubJobAction,
} from "@/app/actions/jobs";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { SubJobDetailDialog } from "@/components/jobs/sub-job-detail-dialog";
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
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { WeightCt } from "@/components/ui/weight-ct";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import { normalizeStages, STAGE_ORDER, type StageType } from "@/lib/validation/jobs";
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
  const [deleteSub, setDeleteSub] = useState<JobSubJobRecord | null>(null);
  const [workSub, setWorkSub] = useState<JobSubJobRecord | null>(null);
  const [editWork, setEditWork] = useState<JobWorkRecord | null>(null);
  const [deleteWork, setDeleteWork] = useState<JobWorkRecord | null>(null);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [deleteJobOpen, setDeleteJobOpen] = useState(false);
  const [viewSub, setViewSub] = useState<JobSubJobRecord | null>(null);

  const activeViewSub = useMemo(
    () => (viewSub ? job.sub_jobs.find((s) => s.id === viewSub.id) ?? null : null),
    [viewSub, job.sub_jobs],
  );

  // Sub-job form states
  const [subStages, setSubStages] = useState<StageType[]>([]);
  const [subThan, setSubThan] = useState("");
  const [subWeight, setSubWeight] = useState("");
  const [subStatus, setSubStatus] = useState<JobStatus>("Pending");

  // Edit sub-job form states
  const [editStages, setEditStages] = useState<StageType[]>(["Sarin", "Dropping", "Galaxy"]);
  const [editCurrentStage, setEditCurrentStage] = useState<string>("Sarin");
  const [editThan, setEditThan] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editStatus, setEditStatus] = useState<JobStatus>("Pending");

  // Add work states
  const [workEmployeeId, setWorkEmployeeId] = useState("");
  const [workDoneThan, setWorkDoneThan] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "subjobs">("details");
  useRecordTitle(job.lot_number);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );

  const createSubPipeline = useMemo(() => normalizeStages(subStages), [subStages]);
  const editSubPipeline = useMemo(() => normalizeStages(editStages), [editStages]);

  function toggleCreateStage(stage: StageType) {
    setFormError(null);
    if (subStages.includes(stage)) {
      setSubStages(subStages.filter((s) => s !== stage));
    } else {
      setSubStages([...subStages, stage]);
    }
  }

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

  function handleOpenAddSubModal() {
    const remaining = Math.max(0, Math.floor(job.remaining_than));
    setSubThan(remaining > 0 ? String(remaining) : "");
    setSubWeight("");
    setSubStatus("Pending");
    setSubStages([]);
    setFormError(null);
    setSubOpen(true);
  }

  function handleOpenEditSubModal(sub: JobSubJobRecord) {
    const rawStages = sub.stages && sub.stages.length > 0 ? sub.stages : [sub.stage ?? "Sarin"];
    setEditStages(normalizeStages(rawStages));
    setEditCurrentStage(sub.current_stage ?? sub.stage ?? "Sarin");
    setEditThan(String(Math.round(sub.than)));
    setEditWeight(String(sub.weight));
    setEditStatus(sub.status);
    setEditSub(sub);
  }

  function handleOpenAddWork(sub: JobSubJobRecord) {
    setFormError(null);
    setWorkEmployeeId("");
    setWorkDoneThan("");
    setWorkSub(sub);
  }

  function handleCloseAddWork() {
    setFormError(null);
    setWorkEmployeeId("");
    setWorkDoneThan("");
    setWorkSub(null);
  }

  function handleOpenEditWork(work: JobWorkRecord) {
    setFormError(null);
    setEditWork(work);
  }

  function handleCloseEditWork() {
    setFormError(null);
    setEditWork(null);
  }

  const eligibleEmployees = useMemo(() => {
    if (!workSub) return [];
    const targetStage = workSub.current_stage ?? workSub.stage ?? "Sarin";
    return activeEmployees.filter((emp) => emp.employee_type === targetStage);
  }, [workSub, activeEmployees]);

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
      setDeleteSub(null);
      setWorkSub(null);
      setEditWork(null);
      setDeleteWork(null);
      setWorkEmployeeId("");
      setWorkDoneThan("");
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={statusTone(job.status)} />
      </TopbarStatus>
      <TopbarActions>
        <IconButton
          tone="edit"
          label="Edit job"
          onClick={() => setEditJobOpen(true)}
        >
          <EditIcon width={16} height={16} />
        </IconButton>
        <IconButton
          tone="delete"
          label="Delete job"
          onClick={() => setDeleteJobOpen(true)}
        >
          <DeleteIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>

      <div className="ui-detail-stack">
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
                    <dt>Sub Jobs</dt>
                    <dd>{job.sub_jobs.length}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Created Date</dt>
                    <dd>{formatDisplayDate(job.created_at)}</dd>
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
                    <dt>Allocated Taan</dt>
                    <dd>{formatThan(job.allocated_than)}</dd>
                  </div>
                  <div className="ui-detail-item">
                    <dt>Remaining Taan</dt>
                    <dd>{formatThan(job.remaining_than)}</dd>
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
              <p className="ui-field-help">No sub-jobs yet. Add a sub-job to start the production workflow.</p>
            ) : (
              <DataTable<JobSubJobRecord>
                caption="Sub Jobs"
                emptyTitle="No sub-jobs found."
                rows={job.sub_jobs}
                rowKey={(row) => row.id}
                getRowProps={() => ({
                  className: "is-clickable",
                })}
                onRowClick={(row) => {
                  setFormError(null);
                  setViewSub(row);
                }}
                columns={[
                  {
                    key: "display_no",
                    header: "Sub-Job No",
                    render: (row) => <strong>{row.display_no}</strong>,
                  },
                  {
                    key: "than",
                    header: "Than",
                    numeric: true,
                    render: (row) => formatThan(row.than),
                  },
                  {
                    key: "weight",
                    header: "Weight",
                    numeric: true,
                    render: (row) => <WeightCt value={row.weight} />,
                  },
                  {
                    key: "stage",
                    header: "Current Stage",
                    render: (row) => {
                      const isSubCompleted = row.status === "Completed" || row.current_stage === "Completed";
                      if (isSubCompleted) {
                        return <span className="ui-badge ui-badge-completed">Completed</span>;
                      }
                      return <JobTypeBadge type={row.current_stage} />;
                    },
                  },
                  {
                    key: "pipeline",
                    header: "Pipeline",
                    render: (row) => (
                      <div className="ui-subjob-pipeline-pills">
                        {row.stages.map((stg) => (
                          <JobTypeBadge key={stg} type={stg} />
                        ))}
                      </div>
                    ),
                  },
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
                        <IconButton
                          tone="edit"
                          label={`Edit ${row.display_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormError(null);
                            handleOpenEditSubModal(row);
                          }}
                        >
                          <EditIcon width={16} height={16} />
                        </IconButton>
                        <IconButton
                          tone="delete"
                          label={`Delete ${row.display_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormError(null);
                            setDeleteSub(row);
                          }}
                        >
                          <DeleteIcon width={16} height={16} />
                        </IconButton>
                      </TableActions>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Edit Job Modal */}
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

      {/* Add Sub Job Modal */}
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
            if (subStages.length === 0) {
              setFormError("Please select at least one stage for this sub-job pipeline.");
              return;
            }
            runMutation(
              () =>
                createSubJobAction({
                  job_id: job.id,
                  than: subThan.trim(),
                  weight: subWeight.trim(),
                  stages: createSubPipeline,
                  status: subStatus,
                }),
              "Sub-job created successfully.",
            );
          }}
        >
          <div className="ui-form-field ui-job-form-full">
            <label className="ui-form-label">
              Production Pipeline Stages <span className="ui-required-mark">*</span>
            </label>
            <div className="ui-stage-checkbox-group" role="group" aria-label="Select pipeline stages">
              {STAGE_ORDER.map((stage) => {
                const isChecked = subStages.includes(stage);
                return (
                  <label
                    key={stage}
                    className={`ui-stage-checkbox-label ${isChecked ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="ui-stage-checkbox"
                      checked={isChecked}
                      disabled={pending}
                      onChange={() => toggleCreateStage(stage)}
                    />
                    <span className="ui-stage-name">{stage}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <FormField
            label="Than"
            htmlFor="create-sub-than"
            required
            help={`Available for this Job: ${Math.floor(job.remaining_than)} (Total Job Than: ${formatThan(job.than)})`}
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
              placeholder={Math.floor(job.remaining_than) > 0 ? String(Math.floor(job.remaining_than)) : "e.g. 4"}
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
              Create Sub-Job
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Sub Job Modal */}
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
              if (editSubPipeline.length === 0) {
                setFormError("Please select at least one stage for this sub-job pipeline.");
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
                        disabled={pending}
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
                disabled={pending}
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

      {/* Add Work Modal */}
      <Dialog
        open={Boolean(workSub)}
        title={workSub ? `Add Work · ${workSub.display_no} (${workSub.current_stage})` : "Add Work"}
        onClose={handleCloseAddWork}
        disableClose={pending}
        footer={null}
      >
        {workSub ? (
          <form
            key={`work-create-${workSub.id}-${workSub.current_stage}`}
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
              <JobTypeBadge type={workSub.current_stage} />
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
                disabled={pending}
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
                disabled={pending}
                onClick={handleCloseAddWork}
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

      {/* Edit Work Modal */}
      <Dialog
        open={Boolean(editWork)}
        title="Edit Work"
        onClose={handleCloseEditWork}
        disableClose={pending}
        footer={null}
      >
        {editWork ? (
          <form
            key={`work-edit-${editWork.id}`}
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
                onClick={handleCloseEditWork}
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
        pending={pending}
        onCancel={() => setDeleteWork(null)}
        onConfirm={() => {
          if (!deleteWork) {
            return;
          }
          runMutation(
            () => deleteEmployeeWorkAction({ id: deleteWork.id }),
            "Work record deleted successfully.",
          );
        }}
      />

      {/* Delete Job Dialog */}
      <ConfirmDialog
        open={deleteJobOpen}
        title="Delete Job?"
        description={`Are you sure you want to delete Job "${job.lot_number}"? This will permanently delete the job, its ${job.sub_jobs.length} sub-jobs, and all associated work records. This action cannot be undone.`}
        confirmLabel="Delete Job"
        danger
        pending={pending}
        onCancel={() => setDeleteJobOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            const res = await deleteJobAction({ id: job.id });
            if (!res.ok) {
              toast.error(res.error?.message ?? "Unable to delete job.");
              return;
            }
            toast.success("Job deleted successfully.");
            router.push("/jobs");
          });
        }}
      />

      {/* Delete Sub-Job Dialog */}
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
        pending={pending}
        onCancel={() => setDeleteSub(null)}
        onConfirm={() => {
          if (!deleteSub) {
            return;
          }
          runMutation(
            () => deleteSubJobAction({ id: deleteSub.id }),
            "Sub-job deleted successfully.",
          );
        }}
      />

      {/* View Sub-Job Details Dialog */}
      <SubJobDetailDialog
        open={Boolean(activeViewSub)}
        subJob={activeViewSub}
        lotNumber={job.lot_number}
        onClose={() => setViewSub(null)}
        pending={pending}
        onEdit={(sub) => {
          setFormError(null);
          handleOpenEditSubModal(sub);
        }}
        onDelete={(sub) => {
          setFormError(null);
          setDeleteSub(sub);
        }}
        onAddWork={(sub) => handleOpenAddWork(sub)}
        onEditWork={(work) => handleOpenEditWork(work)}
        onDeleteWork={(work) => {
          setFormError(null);
          setDeleteWork(work);
        }}
      />
    </>
  );
}
