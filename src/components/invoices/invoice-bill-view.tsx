import { formatBillDate, formatBillNumber, formatInrWords } from "@/lib/formatters";
import { INVOICE_BILL, summarizeBillLines, type InvoiceBillLine } from "@/lib/invoices/bill";

type InvoiceBillViewProps = {
  partyName: string;
  /** The invoice's own invoice_date — shown as "Invoice Date" in the header. */
  invoiceDate: string;
  /** The invoice number shown at the top of the party section. */
  invoiceNumber: string;
  lines: InvoiceBillLine[];
};

const COLUMNS = ["sn", "date", "kapan", "lot", "than", "weight", "rate", "total"] as const;

function numericCell(value: number, fractionDigits?: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "";
  }
  return formatBillNumber(value, fractionDigits);
}

export function InvoiceBillView({ partyName, invoiceDate, invoiceNumber, lines }: InvoiceBillViewProps) {
  const totals = summarizeBillLines(lines);
  const rowCount = Math.max(lines.length, INVOICE_BILL.minTableRows);
  const rowSlots = Array.from({ length: rowCount }, (_, index) => lines[index] ?? null);

  return (
    <div className="invoice-print-shell">
      <div className="invoice-print-sheet invoice-bill">
        <header className="invoice-bill-header">
          <div className="invoice-bill-contact">
            <p>
              {INVOICE_BILL.contactName}
            </p>
            <p>
              {INVOICE_BILL.phone}
            </p>
          </div>
          <div className="invoice-bill-brand">
            <p className="invoice-bill-greeting">
              <strong>{INVOICE_BILL.greeting}</strong>
            </p>
            <p className="invoice-bill-company">{INVOICE_BILL.companyName}</p>
            <p className="invoice-bill-location">
              {INVOICE_BILL.companyLocation}
            </p>
          </div>
        </header>

        <div className="invoice-bill-frame">
          <section className="invoice-bill-party" aria-label="Party">
            {/* Invoice number — full-width row */}
            <div className="invoice-bill-invoice-number">
              <span>Invoice No : </span>
              <strong>{invoiceNumber}</strong>
            </div>

            {/* Party name and invoice date on the same horizontal line */}
            <div className="invoice-bill-party-row">
              <div className="invoice-bill-party-name">{partyName}</div>
              <div className="invoice-bill-invoice-date">
                <span>Invoice Date : </span>
                <strong>{formatBillDate(invoiceDate)}</strong>
              </div>
            </div>

            <div className="invoice-bill-party-body"></div>
            <div className="invoice-bill-month-slot"></div>
            <div className="invoice-bill-month-slot"></div>
            <div className="invoice-bill-month-slot"></div>
          </section>

          <div className="invoice-bill-grid">
            <div className="invoice-bill-cols invoice-bill-head">
              <div>S.N</div>
              <div>DATE</div>
              <div>KAPAN DESCRIPTION</div>
              <div>LOT</div>
              <div>THAN</div>
              <div>WEIGHT</div>
              <div>RATE</div>
              <div>TOTAL</div>
            </div>

            {rowSlots.map((line, index) => (
              <div
                key={`${line?.lot_number ?? "empty"}-${line?.date ?? "none"}-${index}`}
                className="invoice-bill-cols invoice-bill-data"
              >
                <div className="is-sn">{line ? index + 1 : ""}</div>
                <div className="is-date">
                  {line ? formatBillDate(line.date) : ""}
                </div>
                <div className="is-kapan">{line?.kapan_number ?? ""}</div>
                <div className="is-lot">{line?.lot_number ?? ""}</div>
                <div className="is-qty is-than">
                  {line ? numericCell(line.than) : ""}
                </div>
                <div className="is-qty is-weight">
                  {line ? numericCell(line.weight, 3) : ""}
                </div>
                <div className="is-qty is-rate">
                  {line ? numericCell(line.rate) : ""}
                </div>
                <div className="is-qty is-total">
                  {line ? numericCell(line.total) : ""}
                </div>
              </div>
            ))}

            <div
              className="invoice-bill-cols invoice-bill-spacer"
              aria-hidden="true"
            >
              {COLUMNS.map((column) => (
                <div key={column}></div>
              ))}
            </div>

            <div className="invoice-bill-cols invoice-bill-total">
              <div></div>
              <div></div>
              <div className="is-fill">Total</div>
              <div className="is-fill"></div>
              <div className="is-fill is-qty">
                {formatBillNumber(totals.than)}
              </div>
              <div className="is-fill is-qty">
                {totals.weight ? formatBillNumber(totals.weight, 3) : ""}
              </div>
              <div></div>
              <div className="is-fill is-qty">
                {formatBillNumber(totals.total)}
              </div>
            </div>
          </div>

          <section className="invoice-bill-terms">
            <p className="invoice-bill-terms-title">
              <span>{INVOICE_BILL.termsTitle}</span>
              <span>{INVOICE_BILL.eoe}</span>
            </p>
            <p>{INVOICE_BILL.terms}</p>
          </section>

          <p className="invoice-bill-words">
            Bill Amount In Words : {formatInrWords(totals.total)}
          </p>

          <footer className="invoice-bill-footer">
            <div className="invoice-bill-bank">
              <p>Bank Details : {INVOICE_BILL.bankName}</p>
              <p>A/c No : {INVOICE_BILL.accountNumber}</p>
              <p>IFSC Code : {INVOICE_BILL.ifsc}</p>
            </div>
            <div className="invoice-bill-sign">
              <p>
                <strong>For</strong> {INVOICE_BILL.companyName}
              </p>
              <p>Auth. Signatory</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
