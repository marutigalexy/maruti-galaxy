import { describe, expect, it } from "vitest";

import { formatBillDate, formatBillNumber, formatInrWords } from "@/lib/formatters";
import { INVOICE_BILL, billDateFromLines, summarizeBillLines } from "@/lib/invoices/bill";

describe("invoice bill formatters", () => {
  it("formats bill dates as dd/mm/yyyy", () => {
    expect(formatBillDate("2026-04-18")).toBe("18/04/2026");
    expect(formatBillDate("2026-04-26")).toBe("26/04/2026");
  });

  it("omits trailing zeros on whole bill numbers", () => {
    expect(formatBillNumber(12000)).toBe("12000");
    expect(formatBillNumber(70360)).toBe("70360");
    expect(formatBillNumber(10.5)).toBe("10.50");
    expect(formatBillNumber(1.25, 3)).toBe("1.250");
  });

  it("converts INR amounts to Indian words", () => {
    expect(formatInrWords(0)).toBe("Rupees Zero Only");
    expect(formatInrWords(70360)).toBe("Rupees Seventy Thousand Three Hundred Sixty Only");
    expect(formatInrWords(12.5)).toBe("Rupees Twelve and Fifty Paise Only");
    expect(formatInrWords(100000)).toBe("Rupees One Lakh Only");
  });
});

describe("invoice bill totals", () => {
  const lines = [
    {
      date: "2026-04-18",
      lot_number: "C100-6A",
      kapan_number: "K1",
      weight: 1.25,
      than: 10,
      rate: 1200,
      total: 12000,
    },
    {
      date: "2026-04-26",
      lot_number: "C100-27B",
      kapan_number: "K2",
      weight: 2,
      than: 10,
      rate: 1372,
      total: 13720,
    },
  ];

  it("sums than, weight, and total", () => {
    expect(summarizeBillLines(lines)).toEqual({ than: 20, weight: 3.25, total: 25720 });
  });

  it("uses the latest job date as the bill month", () => {
    expect(billDateFromLines(lines)).toBe("2026-04-26");
  });

  it("keeps at least eight table lines", () => {
    expect(INVOICE_BILL.minTableRows).toBe(8);
  });
});

describe("invoice PDF file name generator", () => {
  it("formats file name as 'Company Name - Invoice Number.pdf'", async () => {
    const { getInvoicePdfFileName } = await import("@/lib/invoices/pdf-download");
    expect(getInvoicePdfFileName("ABC Jewellers", "INV-1025")).toBe("ABC Jewellers - INV-1025.pdf");
    expect(getInvoicePdfFileName("Maruti Diamonds Pvt Ltd", "INV-2040")).toBe("Maruti Diamonds Pvt Ltd - INV-2040.pdf");
  });

  it("handles empty or special character fallbacks cleanly", async () => {
    const { getInvoicePdfFileName } = await import("@/lib/invoices/pdf-download");
    expect(getInvoicePdfFileName("", "")).toBe("Party - Invoice.pdf");
    expect(getInvoicePdfFileName("ABC/Jewellers:Global", "INV/1025")).toBe("ABC-Jewellers-Global - INV-1025.pdf");
  });
});

describe("dynamic party details on invoice bill view", () => {
  it("has no hardcoded party or contact details in INVOICE_BILL constants", () => {
    expect(INVOICE_BILL).not.toHaveProperty("contactName");
    expect(INVOICE_BILL).not.toHaveProperty("phone");
    expect(JSON.stringify(INVOICE_BILL)).not.toMatch(/Alpesh/i);
    expect(JSON.stringify(INVOICE_BILL)).not.toMatch(/9727151214/);
  });

  it("renders all party fields when present and non-empty", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { InvoiceBillView } = await import("@/components/invoices/invoice-bill-view");

    const html = renderToStaticMarkup(
      InvoiceBillView({
        partyName: "ABC Jewellers",
        partyContactPerson: "Rajesh Bhai",
        partyMobile: "9876543210",
        invoiceDate: "2026-04-18",
        invoiceNumber: "INV-1001",
        lines: [],
      }),
    );

    expect(html).toContain("<p>ABC Jewellers</p>");
    expect(html).toContain("<p>Rajesh Bhai</p>");
    expect(html).toContain("<p>9876543210</p>");
    expect(html).not.toMatch(/Alpesh/i);
  });

  it("renders only company name and mobile when contact person is empty or null", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { InvoiceBillView } = await import("@/components/invoices/invoice-bill-view");

    const html = renderToStaticMarkup(
      InvoiceBillView({
        partyName: "XYZ Gems",
        partyContactPerson: null,
        partyMobile: "9123456789",
        invoiceDate: "2026-04-18",
        invoiceNumber: "INV-1002",
        lines: [],
      }),
    );

    expect(html).toContain("<p>XYZ Gems</p>");
    expect(html).toContain("<p>9123456789</p>");
    expect(html).not.toContain("Contact Person");
    expect(html).not.toMatch(/Alpesh/i);
  });

  it("renders only company name and contact person when mobile is empty or null", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { InvoiceBillView } = await import("@/components/invoices/invoice-bill-view");

    const html = renderToStaticMarkup(
      InvoiceBillView({
        partyName: "PQR Diamonds",
        partyContactPerson: "Suresh Patel",
        partyMobile: null,
        invoiceDate: "2026-04-18",
        invoiceNumber: "INV-1003",
        lines: [],
      }),
    );

    expect(html).toContain("<p>PQR Diamonds</p>");
    expect(html).toContain("<p>Suresh Patel</p>");
    expect(html).not.toContain("Mobile");
    expect(html).not.toMatch(/Alpesh/i);
  });

  it("renders only company name when contact person and mobile are missing", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { InvoiceBillView } = await import("@/components/invoices/invoice-bill-view");

    const html = renderToStaticMarkup(
      InvoiceBillView({
        partyName: "Solo Company",
        partyContactPerson: "  ",
        partyMobile: "",
        invoiceDate: "2026-04-18",
        invoiceNumber: "INV-1004",
        lines: [],
      }),
    );

    expect(html).toContain("<p>Solo Company</p>");
    expect(html).not.toMatch(/<p>\s*<\/p>/);
    expect(html).not.toMatch(/Alpesh/i);
  });

  it("renders no top-left contact paragraphs when all party fields are empty", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { InvoiceBillView } = await import("@/components/invoices/invoice-bill-view");

    const html = renderToStaticMarkup(
      InvoiceBillView({
        partyName: "",
        partyContactPerson: null,
        partyMobile: null,
        invoiceDate: "2026-04-18",
        invoiceNumber: "INV-1005",
        lines: [],
      }),
    );

    expect(html).toContain('<div class="invoice-bill-contact"></div>');
    expect(html).not.toMatch(/Alpesh/i);
  });
});


