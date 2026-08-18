import { InvoiceBillView } from "@/components/invoices/invoice-bill-view";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoicePrintViewProps = {
  invoice: InvoiceDetail;
};

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
  return (
    <InvoiceBillView
      partyName={invoice.party_name}
      billDate={invoice.invoice_date}
      lines={[
        {
          date: invoice.invoice_date,
          lot_number: invoice.lot_number,
          kapan_number: invoice.kapan_number,
          weight: invoice.weight,
          than: invoice.than,
          rate: invoice.price,
          total: invoice.amount,
        },
      ]}
    />
  );
}
