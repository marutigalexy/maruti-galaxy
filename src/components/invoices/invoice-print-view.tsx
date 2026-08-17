"use client";

import { BrandLogo } from "@/components/brand/logo";
import { formatDisplayDate, formatInr, formatThan, formatWeightCt } from "@/lib/formatters";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoicePrintViewProps = {
  invoice: InvoiceDetail;
};

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
  return (
    <div className="invoice-print-shell">
      <div className="invoice-print-sheet">
        <header className="invoice-print-header">
          <div className="invoice-print-brand">
            <BrandLogo width={200} height={80} priority />
          </div>
          <div>
            <p className="invoice-print-kicker">Invoice</p>
            <h1>{invoice.invoice_number}</h1>
            <p>{invoice.party_name}</p>
          </div>
        </header>
        <dl className="invoice-print-fields">
          <div>
            <dt>DATE</dt>
            <dd>{formatDisplayDate(invoice.invoice_date)}</dd>
          </div>
          <div>
            <dt>KAPAN</dt>
            <dd>{invoice.kapan_number}</dd>
          </div>
          <div>
            <dt>DESCRIPTION</dt>
            <dd>—</dd>
          </div>
          <div>
            <dt>LOT</dt>
            <dd>{invoice.lot_number}</dd>
          </div>
          <div>
            <dt>WEIGHT</dt>
            <dd>{formatWeightCt(invoice.weight)}</dd>
          </div>
          <div>
            <dt>THAN</dt>
            <dd>{formatThan(invoice.than)}</dd>
          </div>
          <div>
            <dt>RATE</dt>
            <dd>{formatInr(invoice.price)}</dd>
          </div>
          <div>
            <dt>TOTAL</dt>
            <dd>{formatInr(invoice.amount)}</dd>
          </div>
          <div>
            <dt>Job Type</dt>
            <dd>{invoice.job_type}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
