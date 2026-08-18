import { z } from "zod";

import { clampPageSize } from "@/lib/api/pagination";
import {
  isoDateSchema,
  moneyPositiveSchema,
  optionalTextSchema,
  pageSchema,
  pageSizeSchema,
  searchSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function emptyToNull(value: unknown): unknown {
  if (value === "" || value === undefined) {
    return null;
  }
  return value;
}

export const ENTRY_TYPES = ["Income", "Expense"] as const;
export const EXPORT_ENTRIES_MAX_ROWS = 5000;

export const entryTypeSchema = z.enum(["Income", "Expense"]);
export const entryTypeFilterSchema = z.enum(["all", "Income", "Expense"]);

export const remarksSchema = optionalTextSchema;

export const entryIdSchema = z.object({
  id: uuidSchema,
});

const entryFields = {
  entry_type: entryTypeSchema,
  account_id: uuidSchema,
  category_id: uuidSchema,
  party_id: z.preprocess(emptyToNull, uuidSchema.nullable()),
  employee_id: z.preprocess(emptyToNull, uuidSchema.nullable()),
  entry_date: isoDateSchema,
  amount: moneyPositiveSchema,
  remarks: z.preprocess(emptyToNull, remarksSchema.nullable()),
};

export const createEntrySchema = z
  .object(entryFields)
  .transform((value) => ({
    entry_type: value.entry_type,
    account_id: value.account_id,
    category_id: value.category_id,
    party_id: value.party_id,
    employee_id: value.employee_id,
    entry_date: value.entry_date,
    amount: value.amount,
    remarks: value.remarks,
  }));

export const updateEntrySchema = z
  .object({
    id: uuidSchema,
    ...entryFields,
  })
  .transform((value) => ({
    id: value.id,
    entry_type: value.entry_type,
    account_id: value.account_id,
    category_id: value.category_id,
    party_id: value.party_id,
    employee_id: value.employee_id,
    entry_date: value.entry_date,
    amount: value.amount,
    remarks: value.remarks,
  }));

export const listEntriesSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    entry_type: entryTypeFilterSchema.optional().default("all"),
    account_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    category_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    party_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    employee_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    date_from: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
    date_to: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: clampPageSize(value.pageSize),
    search: value.search,
    entry_type: value.entry_type,
    account_id: value.account_id,
    category_id: value.category_id,
    party_id: value.party_id,
    employee_id: value.employee_id,
    date_from: value.date_from,
    date_to: value.date_to,
  }))
  .refine(
    (value) => !value.date_from || !value.date_to || value.date_from <= value.date_to,
    { message: "Date From cannot be after Date To." },
  );

export const allocationItemSchema = z.object({
  invoice_id: uuidSchema,
  amount: moneyPositiveSchema,
});

export const allocateEntrySchema = z
  .object({
    entry_id: uuidSchema,
    items: z
      .array(allocationItemSchema)
      .min(1, "Add at least one allocation.")
      .max(50, "Too many allocation rows."),
  })
  .refine(
    (value) => new Set(value.items.map((item) => item.invoice_id)).size === value.items.length,
    { message: "Each invoice can appear only once." },
  );

export const invoiceAllocationItemSchema = z.object({
  entry_id: uuidSchema,
  amount: moneyPositiveSchema,
});

export const allocateInvoiceSchema = z
  .object({
    invoice_id: uuidSchema,
    items: z
      .array(invoiceAllocationItemSchema)
      .min(1, "Add at least one allocation.")
      .max(50, "Too many allocation rows."),
  })
  .refine(
    (value) => new Set(value.items.map((item) => item.entry_id)).size === value.items.length,
    { message: "Each entry can appear only once." },
  );

const paymentFields = {
  account_id: uuidSchema,
  category_id: uuidSchema,
  entry_date: isoDateSchema,
  amount: moneyPositiveSchema,
  remarks: z.preprocess(emptyToNull, remarksSchema.nullable()),
};

export const createInvoicePaymentSchema = z
  .object({
    invoice_id: uuidSchema,
    ...paymentFields,
  })
  .transform((value) => ({
    invoice_id: value.invoice_id,
    account_id: value.account_id,
    category_id: value.category_id,
    entry_date: value.entry_date,
    amount: value.amount,
    remarks: value.remarks,
  }));

export const createPartyPaymentSchema = z
  .object({
    party_id: uuidSchema,
    ...paymentFields,
  })
  .transform((value) => ({
    party_id: value.party_id,
    account_id: value.account_id,
    category_id: value.category_id,
    entry_date: value.entry_date,
    amount: value.amount,
    remarks: value.remarks,
  }));

export type CreateEntryInput = z.output<typeof createEntrySchema>;
export type UpdateEntryInput = z.output<typeof updateEntrySchema>;
export type ListEntriesInput = z.output<typeof listEntriesSchema>;
export type AllocateEntryInput = z.output<typeof allocateEntrySchema>;
export type AllocateInvoiceInput = z.output<typeof allocateInvoiceSchema>;
export type CreateInvoicePaymentInput = z.output<typeof createInvoicePaymentSchema>;
export type CreatePartyPaymentInput = z.output<typeof createPartyPaymentSchema>;
