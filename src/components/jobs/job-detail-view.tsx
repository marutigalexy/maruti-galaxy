"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addEmployeeWorkAction,
  createSubJobAction,
  deleteEmployeeWorkAction,
  updateEmployeeWorkAction,
  updateSubJobAction,
} from "@/app/actions/jobs";
import { JobEditForm } from "@/components/jobs/job-edit-form";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/ui/add-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EditButton } from "@/components/ui/edit-button";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate, formatInr, formatThan, formatWeightCt } from "@/lib/formatters";
import type { EmployeeOption } from "@/services/employees/employees-service";
import type { JobDetail, JobSubJobRecord, JobWorkRecord } from "@/services/jobs/jobs-service";

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

function invoiceTone(status: string) {
  if (status === "Paid") {
    return "paid" as const;
  }
  if (status === "Partially Paid") {
    return "partial" as const;
  }
  return "unpaid" as const;
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
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(job.sub_jobs[0]?.id ?? null);
  const [workEmployeeId, setWorkEmployeeId] = useState("");
  const [workDoneThan, setWorkDoneThan] = useState("");

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );
  const selectedEmployee = activeEmployees.find((employee) => employee.id === workEmployeeId);
  const workPreview =
    selectedEmployee && Number(workDoneThan) > 0
      ? Number(workDoneThan) * selectedEmployee.commission
      : null;

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
      setWorkEmployeeId("");
      setWorkDoneThan("");
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title={job.lot_number}
        action={
          <EditButton onClick={() => setEditJobOpen(true)}>Edit Job</EditButton>
        }
      />
      <p className="ui-field-help">
        <Link href="/jobs">Back to Jobs</Link>
      </p>
      <dl className="ui-detail-grid">
        <div className="ui-detail-item">
          <dt>Lot Number</dt>
          <dd>{job.lot_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Party</dt>
          <dd>{job.party_name}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Job Type</dt>
          <dd>{job.job_type}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Status</dt>
          <dd>
            <StatusBadge tone={statusTone(job.status)} />
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Than</dt>
          <dd>{formatThan(job.than)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Allocated Than</dt>
          <dd>{formatThan(job.allocated_than)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Remaining Than</dt>
          <dd>{formatThan(job.remaining_than)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Weight</dt>
          <dd>{formatWeightCt(job.weight)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Price</dt>
          <dd>{formatInr(job.price)}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Kapan Number</dt>
          <dd>{job.kapan_number}</dd>
        </div>
        <div className="ui-detail-item">
          <dt>Invoice</dt>
          <dd>
            {job.invoice ? (
              <Link href={`/invoices/${job.invoice.id}`}>
                {job.invoice.invoice_number} · {formatInr(job.invoice.amount)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="ui-detail-item">
          <dt>Invoice Status</dt>
          <dd>
            {job.invoice ? <StatusBadge tone={invoiceTone(job.invoice.status)} label={job.invoice.status} /> : "—"}
          </dd>
        </div>
      </dl>

      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">Sub Jobs</h2>
          <AddButton
            onClick={() => {
              setFormError(null);
              setSubOpen(true);
            }}
          >
            Add Sub Job
          </AddButton>
        </div>
        <p className="ui-field-help">
          Main Job Than {formatThan(job.than)} · Allocated {formatThan(job.allocated_than)} · Remaining{" "}
          {formatThan(job.remaining_than)}
        </p>
        {job.sub_jobs.length === 0 ? (
          <p className="ui-field-help">No sub-jobs yet.</p>
        ) : (
          job.sub_jobs.map((sub) => (
            <article key={sub.id} className="ui-subjob">
              <div className="ui-section-header">
                <h3 className="ui-subjob-title">{sub.display_no}</h3>
                <div className="ui-inline-actions">
                  <StatusBadge tone={statusTone(sub.status)} />
                  <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                    {expandedId === sub.id ? "Hide work" : "Show work"}
                  </Button>
                  <EditButton
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setEditSub(sub);
                    }}
                  >
                    Edit
                  </EditButton>
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
              <dl className="ui-detail-grid">
                <div className="ui-detail-item">
                  <dt>Than</dt>
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
                  <dd>{formatWeightCt(sub.weight)}</dd>
                </div>
              </dl>
              {expandedId === sub.id ? (
                <DataTable
                  caption={`${sub.display_no} work`}
                  columns={[
                    { key: "employee", header: "Employee", render: (row) => row.employee_name },
                    { key: "than", header: "Done Than", numeric: true, render: (row) => String(row.done_than) },
                    {
                      key: "commission",
                      header: "Commission (snapshot)",
                      numeric: true,
                      render: (row) => formatInr(row.commission),
                    },
                    { key: "earning", header: "Earning", numeric: true, render: (row) => formatInr(row.earning) },
                    { key: "date", header: "Date", render: (row) => formatDisplayDate(row.created_at) },
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
                          <IconButton tone="delete" label="Delete work" onClick={() => setDeleteWork(row)}>
                            <DeleteIcon width={16} height={16} />
                          </IconButton>
                        </TableActions>
                      ),
                    },
                  ]}
                  rows={sub.work}
                  rowKey={(row) => row.id}
                  emptyTitle="No employee work has been recorded for this sub-job yet."
                />
              ) : null}
            </article>
          ))
        )}
      </section>

      <Dialog
        open={editJobOpen}
        title="Edit Job"
        onClose={() => setEditJobOpen(false)}
        footer={null}
      >
        {editJobOpen ? <JobEditForm job={job} onCancel={() => setEditJobOpen(false)} /> : null}
      </Dialog>

      <Dialog open={subOpen} title="Add Sub Job" onClose={() => setSubOpen(false)} disableClose={pending} footer={null}>
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            runMutation(
              () =>
                createSubJobAction({
                  job_id: job.id,
                  than: String(form.get("than") ?? ""),
                  weight: String(form.get("weight") ?? ""),
                  status: String(form.get("status") ?? "Pending"),
                }),
              "Sub-job created successfully.",
            );
          }}
        >
          <p className="ui-field-help">
            Remaining Main Job Than: {formatThan(job.remaining_than)}. Sub-job number is assigned on save.
          </p>
          <FormField label="Than" htmlFor="create-sub-than" required>
            <Input id="create-sub-than" name="than" inputMode="decimal" required disabled={pending} placeholder="e.g. 4.00" />
          </FormField>
          <FormField label="Weight" htmlFor="create-sub-weight" required>
            <Input id="create-sub-weight" name="weight" inputMode="decimal" required disabled={pending} placeholder="e.g. 1.250" />
          </FormField>
          <FormField label="Status" htmlFor="create-sub-status" required>
            <Select id="create-sub-status" name="status" required defaultValue="Pending" disabled={pending}>
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
            <Button variant="secondary" disabled={pending} onClick={() => setSubOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create"}
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
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runMutation(
                () =>
                  updateSubJobAction({
                    id: editSub.id,
                    than: String(form.get("than") ?? ""),
                    weight: String(form.get("weight") ?? ""),
                    status: String(form.get("status") ?? ""),
                  }),
                "Sub-job updated successfully.",
              );
            }}
          >
            <p className="ui-field-help">
              Remaining Main Job Than if this sub-job is excluded:{" "}
              {formatThan(job.remaining_than + editSub.than)}. Done Than on this sub-job: {formatThan(editSub.done_than)}.
            </p>
            <FormField label="Than" htmlFor="edit-sub-than" required>
              <Input
                id="edit-sub-than"
                name="than"
                inputMode="decimal"
                required
                defaultValue={String(editSub.than)}
                disabled={pending}
                placeholder="e.g. 4.00"
              />
            </FormField>
            <FormField label="Weight" htmlFor="edit-sub-weight" required>
              <Input
                id="edit-sub-weight"
                name="weight"
                inputMode="decimal"
                required
                defaultValue={String(editSub.weight)}
                disabled={pending}
                placeholder="e.g. 1.250"
              />
            </FormField>
            <FormField label="Status" htmlFor="edit-sub-status" required>
              <Select id="edit-sub-status" name="status" required defaultValue={editSub.status} disabled={pending}>
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
              <Button variant="secondary" disabled={pending} onClick={() => setEditSub(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(workSub)}
        title={workSub ? `Add Work · ${workSub.display_no}` : "Add Work"}
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
            <p className="ui-field-help">
              Sub Job Than {formatThan(workSub.than)} · Completed {formatThan(workSub.done_than)} · Remaining{" "}
              {formatThan(workSub.remaining_than)}. Commission is snapshotted from the employee. The same
              employee may be recorded more than once.
            </p>
            <FormField label="Employee" htmlFor="work-employee" required>
              <Select
                id="work-employee"
                name="employee_id"
                required
                disabled={pending}
                value={workEmployeeId}
                onChange={(event) => setWorkEmployeeId(event.target.value)}
              >
                <option value="">Select employee</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {selectedEmployee ? (
              <p className="ui-field-help">
                Current commission {formatInr(selectedEmployee.commission)} per Than (context only; the server stores the snapshot).
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
              <p className="ui-field-help">Preview: Done Than × Commission = {formatInr(workPreview)}. Server value is final.</p>
            ) : null}
            {formError && workSub ? (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="ui-dialog-actions">
              <Button variant="secondary" disabled={pending} onClick={() => setWorkSub(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add Work"}
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
            <p className="ui-field-help">
              {editWork.employee_name}. Commission snapshot {formatInr(editWork.commission)} is kept. Earning is
              recalculated from that snapshot, not the employee&apos;s current rate.
            </p>
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
              <Button variant="secondary" disabled={pending} onClick={() => setEditWork(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
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
          runMutation(() => deleteEmployeeWorkAction({ id: deleteWork.id }), "Work deleted successfully.");
        }}
      />
    </>
  );
}
