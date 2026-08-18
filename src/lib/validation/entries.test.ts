import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/api/csv";
import { parseOrThrow } from "@/lib/validation";
import {
  allocateEntrySchema,
  allocateInvoiceSchema,
  createEntrySchema,
  createInvoicePaymentSchema,
  createPartyPaymentSchema,
  EXPORT_ENTRIES_MAX_ROWS,
  listEntriesSchema,
  updateEntrySchema,
} from "@/lib/validation/entries";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

describe("entry schemas", () => {
  it("requires a positive amount and strips payment fields", () => {
    expect(() =>
      parseOrThrow(createEntrySchema, {
        entry_type: "Income",
        account_id: UUID,
        category_id: UUID_B,
        entry_date: "2026-08-15",
        amount: "0",
      }),
    ).toThrow(/out of range/i);

    const parsed = parseOrThrow(createEntrySchema, {
      entry_type: "Expense",
      account_id: UUID,
      category_id: UUID_B,
      entry_date: "2026-08-15",
      amount: "10.50",
      remarks: " Salary ",
      payment_method: "UPI",
      payment_mode: "Cash",
      transaction_reference: "TXN-1",
    });

    expect(parsed).toMatchObject({
      entry_type: "Expense",
      amount: "10.50",
      remarks: "Salary",
      party_id: null,
      employee_id: null,
    });
    expect(parsed).not.toHaveProperty("payment_method");
    expect(parsed).not.toHaveProperty("payment_mode");
    expect(parsed).not.toHaveProperty("transaction_reference");
  });

  it("rejects Date From after Date To", () => {
    expect(() =>
      parseOrThrow(listEntriesSchema, {
        date_from: "2026-02-01",
        date_to: "2026-01-01",
      }),
    ).toThrow(/Date From cannot be after Date To/);
  });

  it("rejects duplicate allocation rows and non-positive amounts", () => {
    expect(() =>
      parseOrThrow(allocateEntrySchema, {
        entry_id: UUID,
        items: [
          { invoice_id: UUID_B, amount: "1" },
          { invoice_id: UUID_B, amount: "2" },
        ],
      }),
    ).toThrow(/only once/);

    expect(() =>
      parseOrThrow(allocateInvoiceSchema, {
        invoice_id: UUID,
        items: [{ entry_id: UUID_B, amount: "0" }],
      }),
    ).toThrow(/out of range/i);
  });

  it("records job and party payments without client-chosen allocation rows", () => {
    const jobPayment = parseOrThrow(createInvoicePaymentSchema, {
      invoice_id: UUID,
      account_id: UUID,
      category_id: UUID_B,
      entry_date: "2026-08-15",
      amount: "250.50",
      remarks: " Job receipt ",
      items: [{ invoice_id: UUID_B, amount: "1" }],
    });
    expect(jobPayment).toMatchObject({
      invoice_id: UUID,
      amount: "250.50",
      remarks: "Job receipt",
    });
    expect(jobPayment).not.toHaveProperty("items");

    const partyPayment = parseOrThrow(createPartyPaymentSchema, {
      party_id: UUID,
      account_id: UUID,
      category_id: UUID_B,
      entry_date: "2026-08-15",
      amount: "500.00",
      invoice_id: UUID_B,
    });
    expect(partyPayment).toMatchObject({
      party_id: UUID,
      amount: "500.00",
    });
    expect(partyPayment).not.toHaveProperty("invoice_id");
  });

  it("keeps update ids and optional party/employee", () => {
    const parsed = parseOrThrow(updateEntrySchema, {
      id: UUID,
      entry_type: "Income",
      account_id: UUID,
      category_id: UUID_B,
      party_id: "",
      employee_id: UUID,
      entry_date: "2026-08-01",
      amount: "1.00",
      remarks: "",
    });
    expect(parsed.party_id).toBeNull();
    expect(parsed.employee_id).toBe(UUID);
    expect(parsed.remarks).toBeNull();
  });
});

describe("csv helper", () => {
  it("escapes quotes and commas", () => {
    expect(toCsv(["A", "B"], [["hello, world", 'say "hi"']])).toBe(
      'A,B\r\n"hello, world","say ""hi"""\r\n',
    );
  });
});

describe("entry and allocation security", () => {
  const service = readFileSync(
    path.join(process.cwd(), "src/services/entries/entries-service.ts"),
    "utf8",
  );
  const allocations = readFileSync(
    path.join(process.cwd(), "src/services/allocations/allocations-service.ts"),
    "utf8",
  );
  const actions = readFileSync(path.join(process.cwd(), "src/app/actions/entries.ts"), "utf8");
  const exportRoute = readFileSync(
    path.join(process.cwd(), "src/app/api/export/entries/route.ts"),
    "utf8",
  );
  const view = readFileSync(
    path.join(process.cwd(), "src/components/entries/entries-view.tsx"),
    "utf8",
  );
  const invoiceDialog = readFileSync(
    path.join(process.cwd(), "src/components/invoices/invoice-payment-dialog.tsx"),
    "utf8",
  );
  const partyDialog = readFileSync(
    path.join(process.cwd(), "src/components/parties/party-payment-dialog.tsx"),
    "utf8",
  );
  const accounts = readFileSync(
    path.join(process.cwd(), "src/services/accounts/accounts-service.ts"),
    "utf8",
  );

  it("authorizes every entry and allocation method and uses the allocation RPC", () => {
    expect(service.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(allocations.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(allocations).toMatch(/rpc\("allocate_entry_to_invoices"/);
    expect(allocations).not.toMatch(/createSupabaseAdminClient/);
    expect(service).not.toMatch(/createSupabaseAdminClient/);
    expect(actions).toMatch(/parseOrThrow\(createEntrySchema/);
    expect(actions).toMatch(/parseOrThrow\(allocateEntrySchema/);
    expect(actions).toMatch(/parseOrThrow\(allocateInvoiceSchema/);
    expect(actions).toMatch(/parseOrThrow\(createInvoicePaymentSchema/);
    expect(actions).toMatch(/parseOrThrow\(createPartyPaymentSchema/);
    expect(allocations).toMatch(/planInvoiceAllocation/);
    expect(allocations).toMatch(/planFifoAllocations/);
  });

  it("blocks allocated amount/type edits and deletes", () => {
    expect(service).toMatch(/Remove invoice allocations before changing this entry amount or type/);
    expect(service).toMatch(/Remove invoice allocations before deleting this entry/);
  });

  it("exports the filtered CSV with authz, no-store, and a row cap", () => {
    expect(EXPORT_ENTRIES_MAX_ROWS).toBe(5000);
    expect(exportRoute).toMatch(/requireActiveAdmin/);
    expect(exportRoute).toMatch(/parseOrThrow\(listEntriesSchema/);
    expect(exportRoute).toMatch(/Cache-Control": "private, no-store"/);
    expect(service).toMatch(/EXPORT_ENTRIES_MAX_ROWS/);
    expect(service).toMatch(/Too many entries to export/);
  });

  it("does not show payment method fields and computes Net as Income minus Expense", () => {
    expect(view).not.toMatch(/Payment method/);
    expect(view).not.toMatch(/Payment mode/);
    expect(view).not.toMatch(/Transaction reference/);
    expect(view).toMatch(/Net Amount is Total Income minus Total Expense/);
    expect(view).toMatch(/Add Income/);
    expect(view).toMatch(/Add Expense/);
    expect(view).toMatch(/is_active/);
    expect(view).toMatch(/Allocate/);
  });

  it("auto-allocates job payments to the current invoice and party payments FIFO", () => {
    expect(invoiceDialog).toMatch(/>Payment</);
    expect(invoiceDialog).toMatch(/Invoice Total/);
    expect(invoiceDialog).toMatch(/Remaining/);
    expect(invoiceDialog).not.toMatch(/Select invoice/);
    expect(partyDialog).toMatch(/FIFO/);
    expect(partyDialog).toMatch(/Allocation preview/);
  });

  it("keeps account balances derived after entry CUD", () => {
    expect(accounts).toMatch(/from\("v_account_balances"\)/);
    expect(service).toMatch(/from\("entries"\)/);
    expect(service).toMatch(/\.insert\(/);
    expect(service).toMatch(/\.update\(/);
    expect(service).toMatch(/\.delete\(/);
  });
});
