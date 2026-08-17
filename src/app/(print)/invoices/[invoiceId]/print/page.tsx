import { InvoicePrintAuto } from "@/components/invoices/invoice-print-auto";
import { InvoicePrintView } from "@/components/invoices/invoice-print-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { getInvoice } from "@/services/invoices/invoices-service";

type InvoicePrintPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  await requireActiveAdmin();
  const { invoiceId } = await params;

  let invoice;
  try {
    parseOrThrow(uuidSchema, invoiceId);
    invoice = await getInvoice(invoiceId);
  } catch {
    return (
      <ErrorState
        title="Unable to load invoice"
        description="This invoice was not found or could not be loaded."
      />
    );
  }

  return (
    <>
      <InvoicePrintAuto />
      <InvoicePrintView invoice={invoice} />
    </>
  );
}
