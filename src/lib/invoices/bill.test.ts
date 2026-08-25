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

