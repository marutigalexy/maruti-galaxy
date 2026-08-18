"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePartyAction } from "@/app/actions/parties";
import { TopbarActions, TopbarStatus, useRecordTitle } from "@/components/layout/page-chrome";
import { PartyOutstandingPrintButton } from "@/components/parties/party-outstanding-print-button";
import { PartyPaymentDialog } from "@/components/parties/party-payment-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { EditIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/formatters";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";
import type { PartyRecord, PartySummary } from "@/services/parties/parties-service";

type PartyDetailViewProps = {
  party: PartyRecord;
  summary: PartySummary;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

export function PartyDetailView({ party, summary, accounts, categories }: PartyDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useRecordTitle(party.company_name);

  return (
    <>
      <TopbarStatus>
        <StatusBadge tone={party.is_active ? "active" : "inactive"} />
      </TopbarStatus>
      <TopbarActions>
        <PartyOutstandingPrintButton party={party} invoices={summary.invoices} />
        <IconButton tone="edit" label="Edit party" onClick={() => setEditOpen(true)}>
          <EditIcon width={16} height={16} />
        </IconButton>
      </TopbarActions>
      <div className="ui-detail-stack">
        <Card
          title="Party"
          action={
            <PartyPaymentDialog
              partyId={party.id}
              outstanding={summary.outstanding}
              invoices={summary.invoices}
              accounts={accounts}
              categories={categories}
            />
          }
        >
          <dl className="ui-property-list">
            <div className="ui-detail-item">
              <dt>Company Name</dt>
              <dd>{party.company_name}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Contact Person</dt>
              <dd>{party.contact_person_name ?? "—"}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Mobile Number</dt>
              <dd>{party.mobile_number}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Default Price</dt>
              <dd>{formatInr(party.price)}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={party.is_active ? "active" : "inactive"} />
              </dd>
            </div>
            <div className="ui-detail-item">
              <dt>Jobs</dt>
              <dd>{summary.jobsCount}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Invoices</dt>
              <dd>{summary.invoicesCount}</dd>
            </div>
            <div className="ui-detail-item">
              <dt>Outstanding</dt>
              <dd>{formatInr(summary.outstanding)}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Related Jobs">
          <DataTable
            caption="Related jobs"
            columns={[
              {
                key: "lot",
                header: "Lot Number",
                render: (row) => <Link href={`/jobs/${row.id}`}>{row.lot_number}</Link>,
              },
              { key: "status", header: "Status", render: (row) => row.status },
              { key: "than", header: "Than", numeric: true, render: (row) => String(row.than) },
              { key: "price", header: "Job Price", numeric: true, render: (row) => formatInr(row.price) },
            ]}
            rows={summary.jobs}
            rowKey={(row) => row.id}
            emptyTitle="No related jobs yet."
          />
        </Card>
        <Card title="Related Invoices">
          <DataTable
            caption="Related invoices"
            columns={[
              {
                key: "number",
                header: "Invoice Number",
                render: (row) => <Link href={`/jobs/${row.job_work_id}`}>{row.invoice_number}</Link>,
              },
              { key: "amount", header: "Invoice Total", numeric: true, render: (row) => formatInr(row.amount) },
              { key: "paid", header: "Paid", numeric: true, render: (row) => formatInr(row.allocated) },
              { key: "remaining", header: "Remaining", numeric: true, render: (row) => formatInr(row.outstanding) },
              { key: "status", header: "Status", render: (row) => row.status },
            ]}
            rows={summary.invoices}
            rowKey={(row) => row.id}
            emptyTitle="No related invoices yet."
          />
        </Card>
      </div>
      <Dialog open={editOpen} title="Edit Party" onClose={() => setEditOpen(false)} disableClose={pending} footer={null}>
        <form
          className="ui-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setFormError(null);
            startTransition(async () => {
              const outcome = await updatePartyAction({
                id: party.id,
                company_name: String(form.get("company_name") ?? ""),
                contact_person_name: String(form.get("contact_person_name") ?? ""),
                mobile_number: String(form.get("mobile_number") ?? ""),
                price: String(form.get("price") ?? ""),
              });
              if (!outcome.ok) {
                setFormError(outcome.error.message);
                toast.error(outcome.error.message);
                return;
              }
              setEditOpen(false);
              toast.success("Party updated successfully.");
              router.refresh();
            });
          }}
        >
          <FormField label="Company Name" htmlFor="detail-edit-company" required>
            <Input
              id="detail-edit-company"
              name="company_name"
              required
              defaultValue={party.company_name}
              disabled={pending}
              placeholder="e.g. Shree Ram Diamonds"
            />
          </FormField>
          <FormField label="Contact Person Name" htmlFor="detail-edit-contact">
            <Input
              id="detail-edit-contact"
              name="contact_person_name"
              defaultValue={party.contact_person_name ?? ""}
              disabled={pending}
              placeholder="e.g. Amit Patel"
            />
          </FormField>
          <FormField label="Mobile Number" htmlFor="detail-edit-mobile" required>
            <Input
              id="detail-edit-mobile"
              name="mobile_number"
              required
              defaultValue={party.mobile_number}
              disabled={pending}
              placeholder="e.g. 9876543210"
            />
          </FormField>
          <FormField
            label="Price"
            htmlFor="detail-edit-price"
            required
          >
            <Input
              id="detail-edit-price"
              name="price"
              inputMode="decimal"
              required
              defaultValue={String(party.price)}
              disabled={pending}
              placeholder="e.g. 1500.00"
            />
          </FormField>
          {formError ? (
            <p className="ui-field-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="ui-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
