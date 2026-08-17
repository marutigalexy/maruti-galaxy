import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";
import { ErrorState } from "@/components/ui/error-state";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow, uuidSchema } from "@/lib/validation";
import { getInvoice } from "@/services/invoices/invoices-service";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
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

  return <InvoiceDetailView invoice={invoice} />;
}
