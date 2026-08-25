"use client";

import { AddButton } from "@/components/ui/add-button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import { JobTypeBadge } from "@/components/ui/job-type-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActions } from "@/components/ui/table-actions";
import { WeightCt } from "@/components/ui/weight-ct";
import { formatDisplayDate, formatInr, formatThan } from "@/lib/formatters";
import type { JobSubJobRecord, JobWorkRecord } from "@/services/jobs/jobs-service";

type SubJobDetailDialogProps = {
  open: boolean;
  subJob: JobSubJobRecord | null;
  lotNumber?: string;
  onClose: () => void;
  onEdit?: (subJob: JobSubJobRecord) => void;
  onDelete?: (subJob: JobSubJobRecord) => void;
  onAddWork?: (subJob: JobSubJobRecord) => void;
  onEditWork?: (work: JobWorkRecord) => void;
  onDeleteWork?: (work: JobWorkRecord) => void;
  pending?: boolean;
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

export function SubJobDetailDialog({
  open,
  subJob,
  lotNumber,
  onClose,
  onEdit,
  onDelete,
  onAddWork,
  onEditWork,
  onDeleteWork,
  pending = false,
}: SubJobDetailDialogProps) {
  if (!subJob) {
    return null;
  }

  const isCompleted = subJob.status === "Completed" || subJob.current_stage === "Completed";

  const stageStats = subJob.stages.map((stage) => {
    const stageDone = subJob.work
      .filter((w) => w.stage === stage)
      .reduce((sum, item) => sum + item.done_than, 0);
    const isStageCompleted = isCompleted || stageDone >= subJob.than;
    const isStageActive = !isCompleted && stage === subJob.current_stage;
    return {
      stage,
      done: isStageCompleted ? subJob.than : stageDone,
      remaining: isStageCompleted ? 0 : Math.max(0, subJob.than - stageDone),
      isCompleted: isStageCompleted,
      isActive: isStageActive,
    };
  });

  return (
    <Dialog
      open={open}
      className="ui-subjob-detail-dialog"
      title={`Sub-Job Details • ${subJob.display_no}${lotNumber ? ` (${lotNumber})` : ""}`}
      onClose={onClose}
      disableClose={pending}
      headerActions={
        <div className="ui-dialog-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge tone={statusTone(subJob.status)} />
          {onEdit && (
            <IconButton
              tone="edit"
              label={`Edit Sub-Job ${subJob.display_no}`}
              title="Edit Sub-Job"
              disabled={pending}
              onClick={() => onEdit(subJob)}
            >
              <EditIcon width={16} height={16} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              tone="delete"
              label={`Delete Sub-Job ${subJob.display_no}`}
              title="Delete Sub-Job"
              disabled={pending}
              onClick={() => onDelete(subJob)}
            >
              <DeleteIcon width={16} height={16} />
            </IconButton>
          )}
        </div>
      }
      footer={null}
    >
      <div className="ui-subjob-detail-dialog-content">
        {/* Top Summary KPI Cards */}
        <section className="ui-subjob-kpi-grid">
          <div className="ui-subjob-kpi-card">
            <span className="ui-subjob-kpi-label">Active Stage</span>
            <div style={{ marginTop: 2 }}>
              {!isCompleted ? (
                <JobTypeBadge type={subJob.current_stage} />
              ) : (
                <span className="ui-badge ui-badge-completed">Completed</span>
              )}
            </div>
          </div>
          <div className="ui-subjob-kpi-card">
            <span className="ui-subjob-kpi-label">Total Than</span>
            <strong className="ui-subjob-kpi-val">{formatThan(subJob.than)}</strong>
          </div>
          <div className="ui-subjob-kpi-card">
            <span className="ui-subjob-kpi-label">
              {isCompleted ? "Stage Done" : `${subJob.current_stage} Done`}
            </span>
            <strong className="ui-subjob-kpi-val">{formatThan(subJob.done_than)}</strong>
          </div>
          <div className="ui-subjob-kpi-card">
            <span className="ui-subjob-kpi-label">
              {isCompleted ? "Remaining" : `${subJob.current_stage} Rem.`}
            </span>
            <strong className="ui-subjob-kpi-val">{formatThan(subJob.remaining_than)}</strong>
          </div>
          <div className="ui-subjob-kpi-card">
            <span className="ui-subjob-kpi-label">Weight</span>
            <div style={{ marginTop: 2 }}>
              <WeightCt value={subJob.weight} />
            </div>
          </div>
        </section>

        {/* Stage Progress Breakdown for Multi-Stage Sub-Jobs */}
        {subJob.stages.length > 1 && (
          <div className="ui-subjob-stage-progress-strip" aria-label="Pipeline Stage Progress">
            <span className="ui-subjob-kpi-label" style={{ marginRight: 6 }}>
              Stage Progress:
            </span>
            {stageStats.map((stg) => (
              <span
                key={stg.stage}
                className={`ui-subjob-stage-pill ${
                  stg.isCompleted ? "is-done" : stg.isActive ? "is-active" : "is-pending"
                }`}
              >
                <span>{stg.isCompleted ? "✓" : stg.isActive ? "●" : "○"}</span>
                <span>
                  <strong>{stg.stage}</strong>: {formatThan(stg.done)}/{formatThan(subJob.than)} Than
                  {stg.isCompleted ? " (Done)" : stg.isActive ? ` (${formatThan(stg.remaining)} Rem)` : ""}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Employee Work Log */}
        <Card
          title="Employee Work Log"
          action={
            !isCompleted && onAddWork ? (
              <AddButton
                size="sm"
                variant="primary"
                disabled={pending}
                onClick={() => onAddWork(subJob)}
              >
                Add Work
              </AddButton>
            ) : null
          }
        >
          <DataTable<JobWorkRecord>
            caption={`${subJob.display_no} work records`}
            emptyTitle="No employee work has been recorded for this sub-job yet."
            rows={subJob.work}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "date",
                header: "Date",
                render: (row) => formatDisplayDate(row.created_at),
              },
              {
                key: "stage",
                header: "Stage",
                render: (row) => <JobTypeBadge type={row.stage} />,
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
              ...(onEditWork || onDeleteWork
                ? [
                    {
                      key: "actions",
                      header: "Actions",
                      render: (row: JobWorkRecord) => (
                        <TableActions>
                          {onEditWork ? (
                            <IconButton
                              tone="edit"
                              label="Edit work"
                              disabled={pending}
                              onClick={() => onEditWork(row)}
                            >
                              <EditIcon width={16} height={16} />
                            </IconButton>
                          ) : null}
                          {onDeleteWork ? (
                            <IconButton
                              tone="delete"
                              label="Delete work"
                              disabled={pending}
                              onClick={() => onDeleteWork(row)}
                            >
                              <DeleteIcon width={16} height={16} />
                            </IconButton>
                          ) : null}
                        </TableActions>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      </div>
    </Dialog>
  );
}
