"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateJobAction } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { decimalOnly } from "@/lib/ui/input-filters";
import type { JobDetail } from "@/services/jobs/jobs-service";

type JobEditFormProps = {
  job: JobDetail;
  onCancel: () => void;
};

function initialJobDate(isoString?: string | null): string {
  if (!isoString) {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${m}-${d}`;
  }
  return isoString.slice(0, 10);
}

export function JobEditForm({ job, onCancel }: JobEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [than, setThan] = useState(String(job.than));
  const [price, setPrice] = useState(String(job.price));
  const [weight, setWeight] = useState(String(job.weight));
  const [kapanNumber, setKapanNumber] = useState(job.kapan_number);
  const [jobDate, setJobDate] = useState(() => initialJobDate(job.created_at));
  const [status, setStatus] = useState(job.status);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty && !pending);

  return (
    <form
      className="ui-dialog-form ui-job-form"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        startTransition(async () => {
          const outcome = await updateJobAction({
            id: job.id,
            job_date: jobDate.trim(),
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
      <FormField className="ui-job-form-full" label="Party" htmlFor="edit-job-party">
        <Input id="edit-job-party" value={job.party_name} disabled readOnly placeholder="Party name" />
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
            setThan(decimalOnly(event.target.value, 3));
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
            setPrice(decimalOnly(event.target.value, 2));
          }}
        />
      </FormField>
      <FormField label="Kapan Number" htmlFor="edit-job-kapan" required>
        <Input
          id="edit-job-kapan"
          name="kapan_number"
          required
          maxLength={50}
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
            setWeight(decimalOnly(event.target.value, 3));
          }}
          placeholder="e.g. 2.250"
        />
      </FormField>

      <FormField label="Job Date" htmlFor="edit-job-date" required>
        <DatePicker
          id="edit-job-date"
          name="job_date"
          required
          disabled={pending}
          value={jobDate}
          onChange={(event) => {
            setDirty(true);
            setJobDate(event.target.value);
          }}
        />
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
