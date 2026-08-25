"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createJobAction } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { PartyOption } from "@/services/parties/parties-service";

type JobCreateFormProps = {
  parties: PartyOption[];
  onCancel: () => void;
};

const ACTIVE_PARTIES_EMPTY = "Add an active party before creating a job.";

export function JobCreateForm({ parties, onCancel }: JobCreateFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [partyId, setPartyId] = useState("");
  const [price, setPrice] = useState("");
  const [priceEdited, setPriceEdited] = useState(false);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty && !pending);

  const activeParties = useMemo(() => parties.filter((party) => party.is_active), [parties]);

  if (activeParties.length === 0) {
    return (
      <div className="ui-dialog-form ui-job-form">
        <p className="ui-field-help">
          {ACTIVE_PARTIES_EMPTY} <Link href="/parties">Go to Parties</Link>
        </p>
        <div className="ui-dialog-actions">
          <Button variant="secondary" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="ui-dialog-form ui-job-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setFormError(null);
        startTransition(async () => {
          const outcome = await createJobAction({
            party_id: String(form.get("party_id") ?? ""),
            than: String(form.get("than") ?? ""),
            price: String(form.get("price") ?? ""),
            kapan_number: String(form.get("kapan_number") ?? ""),
            weight: String(form.get("weight") ?? ""),
            status: String(form.get("status") ?? "Pending"),
          });
          if (!outcome.ok) {
            setFormError(outcome.error.message);
            toast.error(outcome.error.message);
            return;
          }
          setDirty(false);
          toast.success(`Job ${outcome.data.lot_number} created.`);
          onCancel();
          router.push(`/jobs/${outcome.data.id}`);
          router.refresh();
        });
      }}
      onChange={() => setDirty(true)}
    >
      <FormField label="Party" htmlFor="job-party" required>
        <Select
          id="job-party"
          name="party_id"
          required
          disabled={pending}
          value={partyId}
          onChange={(event) => {
            const nextId = event.target.value;
            setPartyId(nextId);
            const nextParty = activeParties.find((party) => party.id === nextId);
            if (nextParty && !priceEdited) {
              setPrice(String(nextParty.price));
            }
          }}
        >
          <option value="">Select party</option>
          {activeParties.map((party) => (
            <option key={party.id} value={party.id}>
              {party.company_name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Status" htmlFor="job-status" required>
        <Select id="job-status" name="status" required disabled={pending} defaultValue="Pending">
          <option value="Pending">Pending</option>
          <option value="Progress">Progress</option>
          <option value="Completed">Completed</option>
        </Select>
      </FormField>

      <FormField label="Than" htmlFor="job-than" required>
        <Input
          id="job-than"
          name="than"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 10.50"
        />
      </FormField>
      <FormField label="Price" htmlFor="job-price" required>
        <Input
          id="job-price"
          name="price"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 1500.00"
          className="ui-price"
          value={price}
          onChange={(event) => {
            setPriceEdited(true);
            setPrice(event.target.value);
          }}
        />
      </FormField>
      <FormField label="Kapan Number" htmlFor="job-kapan" required>
        <Input id="job-kapan" name="kapan_number" required disabled={pending} placeholder="e.g. KAPAN-2418" />
      </FormField>
      <FormField label="Weight" htmlFor="job-weight" required>
        <Input id="job-weight" name="weight" inputMode="decimal" required disabled={pending} placeholder="e.g. 2.250" />
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
          Create Job
        </Button>
      </div>
    </form>
  );
}
