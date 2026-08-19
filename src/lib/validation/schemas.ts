import { z } from "zod";

import { AppError } from "@/lib/api/result";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/api/pagination";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
}

export const uuidSchema = z
  .string()
  .trim()
  .refine((value) => UUID_RE.test(value), "A valid record id is required.");

export const searchSchema = z
  .string()
  .trim()
  .max(100, "Search is limited to 100 characters.");

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Date is invalid.");

function decimalSchema(maxDecimals: number, options: { min?: number; exclusiveMin?: number }) {
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);

  return z
    .string()
    .trim()
    .refine((value) => pattern.test(value), `Use a number with up to ${maxDecimals} decimal places.`)
    .refine((value) => {
      const amount = Number(value);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (options.exclusiveMin !== undefined) {
        return amount > options.exclusiveMin;
      }
      if (options.min !== undefined) {
        return amount >= options.min;
      }
      return true;
    }, "This value is out of range.");
}

export const moneySchema = decimalSchema(2, { min: 0 });
export const moneyPositiveSchema = decimalSchema(2, { exclusiveMin: 0 });
export const thanSchema = decimalSchema(3, { exclusiveMin: 0 });
export const weightSchema = decimalSchema(3, { min: 0 });

export const signedMoneySchema = z
  .string()
  .trim()
  .refine((value) => /^-?\d+(\.\d{1,2})?$/.test(value), "Use a number with up to 2 decimal places.")
  .refine((value) => Number.isFinite(Number(value)), "This value is out of range.");

export const optionalTextSchema = z
  .string()
  .trim()
  .max(100, "This field is limited to 100 characters.")
  .transform((value) => (value === "" ? null : value));

export const requiredNameSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(200, "This field is limited to 200 characters.");

export const mobileSchema = z
  .string()
  .trim()
  .min(1, "Mobile Number is required.")
  .max(20, "Mobile Number is limited to 20 characters.");

export const statusFilterSchema = z.enum(["all", "active", "inactive"]).optional().default("all");

export const pageSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).default(1),
);

export const pageSizeSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
);

export const paginationSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
  })
  .transform((value) => ({
    page: value.page,
    pageSize: DEFAULT_PAGE_SIZE,
  }));

export const listQuerySchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: statusFilterSchema,
  })
  .transform((value) => ({
    page: value.page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: value.search,
    status: value.status,
  }));

export type ListQueryInput = z.output<typeof listQuerySchema>;

export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError("VALIDATION", first?.message ?? "Invalid input.");
  }
  return parsed.data;
}
