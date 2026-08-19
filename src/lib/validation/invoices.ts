import { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import {
  isoDateSchema,
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

export const INVOICE_STATUSES = ["Unpaid", "Partially Paid", "Paid"] as const;

export const invoiceStatusSchema = z.enum(["Unpaid", "Partially Paid", "Paid"]);
export const invoiceStatusFilterSchema = z.enum(["all", "Unpaid", "Partially Paid", "Paid"]);

export const invoiceIdSchema = z.object({
  id: uuidSchema,
});

export const listInvoicesSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: invoiceStatusFilterSchema.optional().default("all"),
    party_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    date_from: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
    date_to: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: value.search,
    status: value.status,
    party_id: value.party_id,
    date_from: value.date_from,
    date_to: value.date_to,
  }))
  .refine((value) => !value.date_from || !value.date_to || value.date_from <= value.date_to, {
    message: "Date From cannot be after Date To.",
  });

export type ListInvoicesInput = z.output<typeof listInvoicesSchema>;
