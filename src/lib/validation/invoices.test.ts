import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseOrThrow } from "@/lib/validation";
import { invoiceIdSchema, listInvoicesSchema } from "@/lib/validation/invoices";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("invoice schemas", () => {
  it("parses list filters and strips extra fields", () => {
    const parsed = parseOrThrow(listInvoicesSchema, {
      search: " INV-0001 ",
      status: "Unpaid",
      party_id: UUID,
      date_from: "2026-01-01",
      date_to: "2026-01-31",
      tax: "18",
      discount: "10",
      due_date: "2026-02-01",
    });

    expect(parsed).toMatchObject({
      search: "INV-0001",
      status: "Unpaid",
      party_id: UUID,
      date_from: "2026-01-01",
      date_to: "2026-01-31",
      page: 1,
      pageSize: 30,
    });
    expect(parsed).not.toHaveProperty("tax");
    expect(parsed).not.toHaveProperty("discount");
    expect(parsed).not.toHaveProperty("due_date");
  });

  it("rejects Date From after Date To and unknown statuses", () => {
    expect(() =>
      parseOrThrow(listInvoicesSchema, {
        date_from: "2026-02-01",
        date_to: "2026-01-01",
      }),
    ).toThrow(/Date From cannot be after Date To/);

    expect(() => parseOrThrow(listInvoicesSchema, { status: "Overdue" })).toThrow();
    expect(() => parseOrThrow(listInvoicesSchema, { pageSize: 1000 })).toThrow();
  });

  it("requires a uuid invoice id", () => {
    expect(parseOrThrow(invoiceIdSchema, { id: UUID, amount: "999" })).toEqual({ id: UUID });
    expect(() => parseOrThrow(invoiceIdSchema, { id: "INV-0001" })).toThrow();
  });
});

describe("invoice read security", () => {
  const service = readFileSync(
    path.join(process.cwd(), "src/services/invoices/invoices-service.ts"),
    "utf8",
  );
  const actions = readFileSync(path.join(process.cwd(), "src/app/actions/invoices.ts"), "utf8");
  const listView = readFileSync(
    path.join(process.cwd(), "src/components/jobs/jobs-view.tsx"),
    "utf8",
  );
  const jobDetail = readFileSync(
    path.join(process.cwd(), "src/components/jobs/job-detail-view.tsx"),
    "utf8",
  );
  const detail = readFileSync(
    path.join(process.cwd(), "src/components/invoices/invoice-detail-view.tsx"),
    "utf8",
  );
  const printView = readFileSync(
    path.join(process.cwd(), "src/components/invoices/invoice-print-view.tsx"),
    "utf8",
  );
  const printButton = readFileSync(
    path.join(process.cwd(), "src/components/invoices/invoice-print-button.tsx"),
    "utf8",
  );
  const printLayout = readFileSync(
    path.join(process.cwd(), "src/app/(print)/layout.tsx"),
    "utf8",
  );
  const billView = readFileSync(
    path.join(process.cwd(), "src/components/invoices/invoice-bill-view.tsx"),
    "utf8",
  );
  const css = readFileSync(path.join(process.cwd(), "src/styles/components.css"), "utf8");
  const billCopy = readFileSync(path.join(process.cwd(), "src/lib/invoices/bill.ts"), "utf8");
  const partyPrintView = readFileSync(
    path.join(process.cwd(), "src/components/parties/party-outstanding-print-view.tsx"),
    "utf8",
  );
  const partyPrintButton = readFileSync(
    path.join(process.cwd(), "src/components/parties/party-outstanding-print-button.tsx"),
    "utf8",
  );
  const migration = readFileSync(
    path.join(process.cwd(), "supabase/migrations/migration_01.sql"),
    "utf8",
  );

  it("is a read-only JWT service with derived outstanding", () => {
    expect(service).toMatch(/from\("v_invoice_outstanding"\)/);
    expect(service).toMatch(/derived_status/);
    expect(service).toMatch(/from\("entry_invoice_allocations"\)/);
    expect(service).toMatch(/createSupabaseServerClient/);
    expect(service).not.toMatch(/createSupabaseAdminClient/);
    expect(service).not.toMatch(/\.insert\(/);
    expect(service).not.toMatch(/\.update\(/);
    expect(service).not.toMatch(/\.delete\(/);
    expect(service).not.toMatch(/rpc\(/);
    expect(service.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("does not expose invoice create, update, or delete actions", () => {
    expect(actions).toMatch(/parseOrThrow\(listInvoicesSchema/);
    expect(actions).toMatch(/parseOrThrow\(invoiceIdSchema/);
    expect(actions).not.toMatch(/createInvoice/);
    expect(actions).not.toMatch(/updateInvoice/);
    expect(actions).not.toMatch(/deleteInvoice/);
  });

  it("keeps one invoice per job and stores amount as than × price", () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX invoices_job_work_id_uidx/);
    expect(migration).toMatch(/round\(v_job\.than \* v_job\.price, 2\)/);
    expect(service).toMatch(/from\("invoices"\)/);
    expect(detail).toMatch(/comes from the invoice record/);
  });

  it("does not invent tax fields or DESCRIPTION copy", () => {
    const ui = `${listView}\n${detail}\n${printView}\n${billView}`;
    expect(ui).not.toMatch(/Due Date/);
    expect(ui).not.toMatch(/Discount/);
    expect(ui).not.toMatch(/Tax Amount/);
    expect(ui).not.toMatch(/Subtotal/);
    expect(ui).not.toMatch(/GST/);
    expect(ui).not.toMatch(/Payment method/);
    expect(ui).not.toMatch(/Transaction reference/);
    expect(detail).toMatch(/<dt>DESCRIPTION<\/dt>/);
    expect(detail).toMatch(/<dd>—<\/dd>/);
    expect(billView).toMatch(/KAPAN DESCRIPTION/);
    expect(billView).toMatch(/kapan_number/);
    expect(billView).toMatch(/invoice-bill-spacer/);
    expect(billView).toMatch(/INVOICE_BILL\.minTableRows/);
    expect(billView).not.toMatch(/invoice-bill-empty/);
    expect(billView).not.toMatch(/paddedBillRowCount/);
    expect(jobDetail).toMatch(/<dt>Job Type<\/dt>/);
    expect(`${listView}\n${detail}`).not.toMatch(/>Allocate</);
  });

  it("prints without the application shell", () => {
    expect(printLayout).not.toMatch(/AppShell/);
    expect(printLayout).toMatch(/getCurrentUserAction/);
    expect(printButton).toMatch(/window\.print/);
    expect(printView).toMatch(/InvoiceBillView/);
    expect(billCopy).toMatch(/MARUTI GALEXY/);
    expect(billView).toMatch(/Auth\. Signatory/);
    expect(listView).toMatch(/InvoicePrintButton/);
    expect(jobDetail).toMatch(/InvoicePrintButton/);
    expect(listView).not.toMatch(/\/invoices\/.*\/print/);
    expect(jobDetail).not.toMatch(/\/invoices\/.*\/print/);
    expect(detail).not.toMatch(/\/invoices\/.*\/print/);
    expect(partyPrintButton).toMatch(/window\.print/);
    expect(partyPrintView).toMatch(/InvoiceBillView/);
    expect(partyPrintView).toMatch(/outstanding > 0/);
    expect(css).toMatch(/\.invoice-print-root[\s\S]*overflow:\s*visible\s*!important/);
    expect(css).toMatch(/\.invoice-bill[\s\S]*height:\s*auto\s*!important/);
    expect(css).toMatch(/\.invoice-bill-footer[\s\S]*page-break-inside:\s*avoid/);
    expect(css).toMatch(/bottom:\s*auto;/);
  });
});
