export const INVOICE_BILL = {
  greeting: "Shree Ganeshay Namh",
  companyName: "MARUTI GALEXY",
  companyLocation: "SHIV APARTMENT MINIBAZAR",
  bankName: "BANK OF INDIA",
  accountNumber: "270710110016340",
  ifsc: "BKID0002707",
  termsTitle: "Terms & Conditions:",
  eoe: "E.&.O.E.",
  terms:
    "1. Let's get forgotten 2. The mistake in the bill should be shown in 7 days. 3. The bill will have to be decided on date 5 to 10.",
  minTableRows: 8,
} as const;

export type InvoiceBillLine = {
  date: string;
  lot_number: string;
  kapan_number: string;
  weight: number;
  than: number;
  rate: number;
  total: number;
};

export type InvoiceBillTotals = {
  than: number;
  weight: number;
  total: number;
};

export function summarizeBillLines(lines: InvoiceBillLine[]): InvoiceBillTotals {
  return lines.reduce<InvoiceBillTotals>(
    (sum, line) => ({
      than: sum.than + line.than,
      weight: sum.weight + line.weight,
      total: sum.total + line.total,
    }),
    { than: 0, weight: 0, total: 0 },
  );
}

export function billDateFromLines(lines: InvoiceBillLine[]): string {
  const dates = lines.map((line) => line.date).filter((date) => date !== "");
  dates.sort();
  return dates.at(-1) ?? "";
}
