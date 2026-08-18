import { InvoiceBillView } from "@/components/invoices/invoice-bill-view";
import { billDateFromLines, type InvoiceBillLine } from "@/lib/invoices/bill";
import type { PartyInvoiceRow, PartyRecord } from "@/services/parties/parties-service";

type PartyOutstandingPrintViewProps = {
  party: PartyRecord;
  invoices: PartyInvoiceRow[];
};

function outstandingLines(invoices: PartyInvoiceRow[]): InvoiceBillLine[] {
  return invoices
    .filter((invoice) => invoice.outstanding > 0)
    .map((invoice) => ({
      date: invoice.invoice_date,
      lot_number: invoice.lot_number,
      kapan_number: invoice.kapan_number,
      weight: invoice.weight,
      than: invoice.than,
      rate: invoice.price,
      total: invoice.amount,
    }));
}

export function PartyOutstandingPrintView({ party, invoices }: PartyOutstandingPrintViewProps) {
  const lines = outstandingLines(invoices);

  return (
    <InvoiceBillView partyName={party.company_name} billDate={billDateFromLines(lines)} lines={lines} />
  );
}
