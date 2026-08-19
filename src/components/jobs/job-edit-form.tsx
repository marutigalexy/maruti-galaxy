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
import { formatInr } from "@/lib/formatters";
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
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty && !pending);

  const previewAmount = useMemo(() => {
    const nextThan = Number(than);
    const nextPrice = Number(price);
    if (!Number.isFinite(nextThan) || !Number.isFinite(nextPrice)) {
      return null;
    }
    return Math.round(nextThan * nextPrice * 100) / 100;
  }, [than, price]);

  return (
    <form
      className="ui-dialog-form ui-job-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setFormError(null);
        startTransition(async () => {
          const outcome = await updateJobAction({
            id: job.id,
            job_type: String(form.get("job_type") ?? ""),
            than: String(form.get("than") ?? ""),
            price: String(form.get("price") ?? ""),
            kapan_number: String(form.get("kapan_number") ?? ""),
            weight: String(form.get("weight") ?? ""),
            status: String(form.get("status") ?? ""),
          });
          if (!outcome.ok) {
            setFormError(outcome.error.message);
            toast.error(outcome.error.message);
            return;
          }
          setDirty(false);
          toast.success(`Job updated. Invoice amount is ${formatInr(outcome.data.invoice?.amount ?? 0)}.`);
          onCancel();
          router.refresh();
        });
      }}
      onChange={() => setDirty(true)}
    >
      <FormField label="Party" htmlFor="edit-job-party">
        <Input id="edit-job-party" value={job.party_name} disabled readOnly placeholder="Party name" />
      </FormField>
      <FormField label="Lot Number" htmlFor="edit-job-lot">
        <Input id="edit-job-lot" value={job.lot_number} disabled readOnly placeholder="Lot number" />
      </FormField>
      <FormField label="Job Type" htmlFor="edit-job-type" required>
        <Select id="edit-job-type" name="job_type" required disabled={pending} defaultValue={job.job_type}>
          <option value="Sarin">Sarin</option>
          <option value="Dropping">Dropping</option>
          <option value="Galaxy">Galaxy</option>
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
          onChange={(event) => setThan(event.target.value)}
        />
      </FormField>
      <FormField label="Price" htmlFor="edit-job-price">
        <Input
          id="edit-job-price"
          name="price"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 1500.00"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </FormField>
      <FormField label="Kapan Number" htmlFor="edit-job-kapan" required>
        <Input
          id="edit-job-kapan"
          name="kapan_number"
          required
          disabled={pending}
          defaultValue={job.kapan_number}
          placeholder="e.g. KAPAN-2418"
        />
      </FormField>
      <FormField label="Weight" htmlFor="edit-job-weight">
        <Input
          id="edit-job-weight"
          name="weight"
          inputMode="decimal"
          required
          disabled={pending}
          defaultValue={String(job.weight)}
          placeholder="e.g. 2.250"
        />
      </FormField>
      <FormField label="Status" htmlFor="edit-job-status" required>
        <Select id="edit-job-status" name="status" required disabled={pending} defaultValue={job.status}>
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
