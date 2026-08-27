import { InvoiceBillView } from "@/components/invoices/invoice-bill-view";
import type { InvoiceBillLine } from "@/lib/invoices/bill";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoicePrintViewProps = {
  invoice: InvoiceDetail;
};

/**
 * Maps every job linked to this invoice (via invoice_jobs) to one bill line.
 * The total for each line uses billing_amount when set, otherwise than × price —
 * matching the amount formula used at invoice creation time.
 */
function jobsToBillLines(invoice: InvoiceDetail): InvoiceBillLine[] {
  return invoice.jobs.map((job) => {
    const total =
      job.billing_amount != null
        ? job.billing_amount
        : Math.round(job.than * job.price * 100) / 100;

    return {
      // Use the job's created_at date as the line date (when the job was received).
      date: job.created_at,
      lot_number: job.lot_number,
      kapan_number: job.kapan_number,
      weight: job.weight,
      than: job.than,
      rate: job.price,
      total,
    };
  });
}

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
  const lines = jobsToBillLines(invoice);

  return (
    <InvoiceBillView
      invoiceNumber={invoice.invoice_number}
      invoiceDate={invoice.invoice_date}
      partyName={invoice.party_name !== "—" ? invoice.party_name : undefined}
      partyContactPerson={invoice.party_contact_person_name}
      partyMobile={invoice.party_mobile_number}
      lines={lines}
    />
  );
}
