import { z } from "zod";

import { clampPageSize } from "@/lib/api/pagination";
import {
  moneySchema,
  pageSchema,
  pageSizeSchema,
  searchSchema,
  thanSchema,
  uuidSchema,
  weightSchema,
} from "@/lib/validation/schemas";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const JOB_TYPES = ["Sarin", "Dropping", "Galaxy"] as const;
export const JOB_STATUSES = ["Pending", "Progress", "Completed"] as const;

export const jobTypeSchema = z.enum(["Sarin", "Dropping", "Galaxy"]);
export const jobStatusSchema = z.enum(["Pending", "Progress", "Completed"]);
export const jobTypeFilterSchema = z.enum(["all", "Sarin", "Dropping", "Galaxy"]);
export const jobStatusFilterSchema = z.enum(["all", "Pending", "Progress", "Completed"]);

export const kapanSchema = z
  .string()
  .trim()
  .min(1, "Kapan Number is required.")
  .max(100, "Kapan Number is limited to 100 characters.");

export const createJobSchema = z.object({
  party_id: uuidSchema,
  job_type: jobTypeSchema,
  than: thanSchema,
  price: moneySchema,
  kapan_number: kapanSchema,
  weight: weightSchema,
  status: jobStatusSchema.optional().default("Pending"),
});

export const updateJobSchema = z.object({
  id: uuidSchema,
  job_type: jobTypeSchema,
  than: thanSchema,
  price: moneySchema,
  kapan_number: kapanSchema,
  weight: weightSchema,
  status: jobStatusSchema,
});

export const createSubJobSchema = z.object({
  job_id: uuidSchema,
  than: thanSchema,
  weight: weightSchema,
  status: jobStatusSchema.optional().default("Pending"),
});

export const updateSubJobSchema = z.object({
  id: uuidSchema,
  than: thanSchema,
  weight: weightSchema,
  status: jobStatusSchema,
});

export const addEmployeeWorkSchema = z.object({
  sub_job_id: uuidSchema,
  employee_id: uuidSchema,
  done_than: thanSchema,
});

export const updateEmployeeWorkSchema = z.object({
  id: uuidSchema,
  done_than: thanSchema,
});

export const workIdSchema = z.object({
  id: uuidSchema,
});

export const jobIdSchema = z.object({
  id: uuidSchema,
});

export const listJobsSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: jobStatusFilterSchema.optional().default("all"),
    job_type: jobTypeFilterSchema.optional().default("all"),
    party_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    employee_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: clampPageSize(value.pageSize),
    search: value.search,
    status: value.status,
    job_type: value.job_type,
    party_id: value.party_id,
    employee_id: value.employee_id,
  }));

export type CreateJobInput = z.output<typeof createJobSchema>;
export type UpdateJobInput = z.output<typeof updateJobSchema>;
export type CreateSubJobInput = z.output<typeof createSubJobSchema>;
export type UpdateSubJobInput = z.output<typeof updateSubJobSchema>;
export type AddEmployeeWorkInput = z.output<typeof addEmployeeWorkSchema>;
export type UpdateEmployeeWorkInput = z.output<typeof updateEmployeeWorkSchema>;
export type ListJobsInput = z.output<typeof listJobsSchema>;
