"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateJobAction } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { normalizeStages, STAGE_ORDER, type StageType } from "@/lib/validation/jobs";
import type { JobDetail } from "@/services/jobs/jobs-service";

type JobEditFormProps = {
  job: JobDetail;
  onCancel: () => void;
};

export function JobEditForm({ job, onCancel }: JobEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [than, setThan] = useState(String(job.than));
  const [price, setPrice] = useState(String(job.price));
  const [weight, setWeight] = useState(String(job.weight));
  const [kapanNumber, setKapanNumber] = useState(job.kapan_number);
  const [status, setStatus] = useState(job.status);
  const [selectedStages, setSelectedStages] = useState<StageType[]>(() =>
    normalizeStages(job.stages ?? [job.job_type ?? "Sarin"]),
  );
  const [currentStage, setCurrentStage] = useState<string>(job.current_stage ?? "Sarin");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty && !pending);

  const pipeline = useMemo(() => normalizeStages(selectedStages), [selectedStages]);

  function toggleStage(stage: StageType) {
    setDirty(true);
    if (selectedStages.includes(stage)) {
      if (selectedStages.length === 1) {
        toast.error("A job must have at least one stage.");
        return;
      }
      const next = selectedStages.filter((s) => s !== stage);
      const nextNorm = normalizeStages(next);
      if (!nextNorm.includes(currentStage as StageType) && currentStage !== "Completed") {
        setCurrentStage(nextNorm[0] ?? "Sarin");
      }
      setSelectedStages(next);
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  }

  return (
    <form
      className="ui-dialog-form ui-job-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (pipeline.length === 0) {
          setFormError("Please select at least one stage for this job.");
          return;
        }
        setFormError(null);
        startTransition(async () => {
          const outcome = await updateJobAction({
            id: job.id,
            stages: pipeline,
            current_stage: currentStage,
            job_type: pipeline[0] as "Sarin" | "Dropping" | "Galaxy",
            than: than.trim(),
            price: price.trim(),
            kapan_number: kapanNumber.trim(),
            weight: weight.trim(),
            status,
          });
          if (!outcome.ok) {
            setFormError(outcome.error.message);
            toast.error(outcome.error.message);
            return;
          }
          setDirty(false);
          toast.success("Job updated successfully.");
          onCancel();
          router.refresh();
        });
      }}
      onChange={() => setDirty(true)}
    >
      <FormField label="Party" htmlFor="edit-job-party" className="ui-job-form-full">
        <Input id="edit-job-party" value={job.party_name} disabled readOnly placeholder="Party name" />
      </FormField>

      <div className="ui-form-field ui-job-form-full">
        <label className="ui-form-label">
          Job Stages <span className="ui-required-mark">*</span>
        </label>
        <div className="ui-stage-checkbox-group" role="group" aria-label="Select job stages">
          {STAGE_ORDER.map((stage) => {
            const isChecked = selectedStages.includes(stage);
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
                  onChange={() => toggleStage(stage)}
                />
                <span className="ui-stage-name">{stage}</span>
              </label>
            );
          })}
        </div>
      </div>

      <FormField label="Current Active Stage" htmlFor="edit-current-stage" required>
        <Select
          id="edit-current-stage"
          name="current_stage"
          required
          disabled={pending}
          value={currentStage}
          onChange={(event) => {
            setDirty(true);
            setCurrentStage(event.target.value);
          }}
        >
          {pipeline.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
          <option value="Completed">Completed</option>
        </Select>
      </FormField>

      <FormField label="Status" htmlFor="edit-job-status" required>
        <Select
          id="edit-job-status"
          name="status"
          required
          disabled={pending}
          value={status}
          onChange={(event) => {
            setDirty(true);
            setStatus(event.target.value as typeof job.status);
          }}
        >
          <option value="Pending">Pending</option>
          <option value="Progress">Progress</option>
          <option value="Completed">Completed</option>
        </Select>
      </FormField>

      <FormField label="Than" htmlFor="edit-job-than" required>
        <Input
          id="edit-job-than"
          name="than"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 10.50"
          value={than}
          onChange={(event) => {
            setDirty(true);
            setThan(event.target.value);
          }}
        />
      </FormField>
      <FormField label="Price" htmlFor="edit-job-price" required>
        <Input
          id="edit-job-price"
          name="price"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 1500.00"
          className="ui-price"
          value={price}
          onChange={(event) => {
            setDirty(true);
            setPrice(event.target.value);
          }}
        />
      </FormField>
      <FormField label="Kapan Number" htmlFor="edit-job-kapan" required>
        <Input
          id="edit-job-kapan"
          name="kapan_number"
          required
          disabled={pending}
          value={kapanNumber}
          onChange={(event) => {
            setDirty(true);
            setKapanNumber(event.target.value);
          }}
          placeholder="e.g. KAPAN-2418"
        />
      </FormField>
      <FormField label="Weight" htmlFor="edit-job-weight" required>
        <Input
          id="edit-job-weight"
          name="weight"
          inputMode="decimal"
          required
          disabled={pending}
          value={weight}
          onChange={(event) => {
            setDirty(true);
            setWeight(event.target.value);
          }}
          placeholder="e.g. 2.250"
        />
      </FormField>
      {formError ? (
        <p className="ui-field-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="ui-dialog-actions">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Update
        </Button>
      </div>
    </form>
  );
}
