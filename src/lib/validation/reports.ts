import { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { listEntriesSchema } from "@/lib/validation/entries";
import { listInvoicesSchema } from "@/lib/validation/invoices";
import {
  jobStatusFilterSchema,
  jobTypeFilterSchema,
} from "@/lib/validation/jobs";
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

const dateRangeFields = {
  date_from: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
  date_to: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
};

function withDateOrder<T extends z.ZodType>(schema: T) {
  return schema.refine(
    (value) => {
      const record = value as { date_from?: string; date_to?: string };
      return !record.date_from || !record.date_to || record.date_from <= record.date_to;
    },
    { message: "Date From cannot be after Date To." },
  );
}

export const EXPORT_REPORT_MAX_ROWS = 5000;

export const jobWorkReportSchema = withDateOrder(
  z
    .object({
      page: pageSchema,
      pageSize: pageSizeSchema,
      search: z.preprocess((value) => value ?? "", searchSchema),
      status: jobStatusFilterSchema.optional().default("all"),
      job_type: jobTypeFilterSchema.optional().default("all"),
      party_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
      ...dateRangeFields,
    })
    .transform((value) => ({
      page: value.page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: value.search,
      status: value.status,
      job_type: value.job_type,
      party_id: value.party_id,
      date_from: value.date_from,
      date_to: value.date_to,
    })),
);

export const entryReportSchema = listEntriesSchema;
export const outstandingReportSchema = listInvoicesSchema;

export const salaryReportSchema = withDateOrder(
  z
    .object({
      page: pageSchema,
      pageSize: pageSizeSchema,
      search: z.preprocess((value) => value ?? "", searchSchema),
      employee_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
      ...dateRangeFields,
    })
    .transform((value) => ({
      page: value.page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: value.search,
      employee_id: value.employee_id,
      date_from: value.date_from,
      date_to: value.date_to,
    })),
);

export const profitLossSchema = withDateOrder(
  z
    .object(dateRangeFields)
    .transform((value) => ({
      date_from: value.date_from,
      date_to: value.date_to,
    })),
);

export const outstandingPartiesSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: z.enum(["all", "Unpaid", "Partially Paid", "Paid"]).optional().default("all"),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: value.pageSize ?? DEFAULT_PAGE_SIZE,
    search: value.search,
    status: value.status,
  }));

export type JobWorkReportInput = z.output<typeof jobWorkReportSchema>;
export type EntryReportInput = z.output<typeof entryReportSchema>;
export type OutstandingReportInput = z.output<typeof outstandingReportSchema>;
export type OutstandingPartiesInput = z.output<typeof outstandingPartiesSchema>;
export type SalaryReportInput = z.output<typeof salaryReportSchema>;
export type ProfitLossInput = z.output<typeof profitLossSchema>;
