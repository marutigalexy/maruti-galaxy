import { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
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

export const STAGE_ORDER = ["Sarin", "Dropping", "Galaxy"] as const;
export type StageType = (typeof STAGE_ORDER)[number];

export const JOB_TYPES = ["Sarin", "Dropping", "Galaxy"] as const;
export const JOB_STATUSES = ["Pending", "Progress", "Completed"] as const;

export const stageSchema = z.enum(["Sarin", "Dropping", "Galaxy"]);
export const jobStageSchema = z.enum(["Sarin", "Dropping", "Galaxy", "Completed"]);
export const jobTypeSchema = z.enum(["Sarin", "Dropping", "Galaxy"]);
export const jobStatusSchema = z.enum(["Pending", "Progress", "Completed"]);
export const jobTypeFilterSchema = z.enum(["all", "Sarin", "Dropping", "Galaxy"]);
export const stageFilterSchema = z.enum(["all", "Sarin", "Dropping", "Galaxy", "Completed"]);
export const jobStatusFilterSchema = z.enum(["all", "Pending", "Progress", "Completed"]);

/**
 * Normalizes user-selected stages into the canonical fixed sequence:
 * SARIN → DROPPING → GALAXY
 * Strips duplicates and unselected stages, preserving canonical order.
 */
export function normalizeStages(stages: string[] | readonly string[]): StageType[] {
  const set = new Set(stages.map((s) => s.trim().toLowerCase()));
  const filtered = STAGE_ORDER.filter((stage) => set.has(stage.toLowerCase()));
  return [...filtered];
}

/**
 * Returns the next active stage in the sub-job's stage pipeline.
 * If at the final stage or unknown, returns "Completed".
 */
export function getNextStage(
  stages: string[] | readonly string[],
  currentStage: string,
): StageType | "Completed" {
  const normalized = normalizeStages(stages);
  const idx = normalized.findIndex((s) => s.toLowerCase() === currentStage.trim().toLowerCase());
  if (idx === -1 || idx >= normalized.length - 1) {
    return "Completed";
  }
  return normalized[idx + 1] ?? "Completed";
}

export const kapanSchema = z
  .string()
  .trim()
  .min(1, "Kapan Number is required.")
  .max(50, "Kapan Number must be at most 50 characters.");

export const createJobSchema = z.object({
  party_id: uuidSchema,
  job_type: jobTypeSchema.optional().default("Sarin"),
  than: thanSchema,
  price: moneySchema,
  kapan_number: kapanSchema,
  weight: weightSchema,
  billing_amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    moneySchema.optional(),
  ),
  status: jobStatusSchema.default("Pending"),
});

export const updateJobSchema = z.object({
  id: uuidSchema,
  job_type: jobTypeSchema.optional(),
  than: thanSchema,
  price: moneySchema,
  kapan_number: kapanSchema,
  weight: weightSchema,
  billing_amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    moneySchema.optional(),
  ),
  status: jobStatusSchema,
});

export const integerThanSchema = z
  .preprocess((v) => {
    if (typeof v === "number") return String(Math.floor(v));
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (/^\d+\.0+$/.test(trimmed)) {
        return trimmed.split(".")[0];
      }
      return trimmed;
    }
    return v;
  }, z.string())
  .refine((value) => /^[1-9]\d*$/.test(value), "Than must be a positive integer without decimals.")
  .refine((value) => {
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount > 0;
  }, "This value is out of range.");

export const createSubJobSchema = z
  .object({
    job_id: uuidSchema,
    than: integerThanSchema,
    weight: weightSchema,
    stages: z.preprocess(
      (v) => {
        if (Array.isArray(v)) return v;
        if (typeof v === "string" && v.trim()) return [v.trim()];
        return undefined;
      },
      z.array(stageSchema).optional(),
    ),
    current_stage: z.string().optional(),
    stage: stageSchema.optional(),
    status: jobStatusSchema.optional().default("Pending"),
  })
  .refine(
    (data) => {
      if (data.stages !== undefined && data.stages.length === 0) {
        return false;
      }
      return true;
    },
    {
      message: "Please select at least one stage for this sub-job pipeline.",
      path: ["stages"],
    },
  )
  .transform((data) => {
    const rawStages = data.stages ?? (data.stage ? [data.stage] : ["Sarin"]);
    const stages = normalizeStages(rawStages);
    if (stages.length === 0) {
      throw new Error("Please select at least one stage for this sub-job pipeline.");
    }
    const current_stage = data.current_stage && stages.includes(data.current_stage as StageType)
      ? data.current_stage
      : stages[0] ?? "Sarin";
    return {
      ...data,
      stages: stages.length > 0 ? stages : ["Sarin"],
      current_stage,
      stage: current_stage,
    };
  });

export const updateSubJobSchema = z.object({
  id: uuidSchema,
  than: integerThanSchema,
  weight: weightSchema,
  stages: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string" && v.trim()) return [v.trim()];
      return undefined;
    },
    z.array(stageSchema).min(1).optional(),
  ),
  current_stage: z.string().optional(),
  stage: stageSchema.optional(),
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

export const advanceSubJobStageSchema = z.object({
  sub_job_id: uuidSchema,
});

export const workIdSchema = z.object({
  id: uuidSchema,
});

export const jobIdSchema = z.object({
  id: uuidSchema,
});

export const subJobIdSchema = z.object({
  id: uuidSchema,
});

export const listJobsSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: jobStatusFilterSchema.optional().default("all"),
    job_type: jobTypeFilterSchema.optional().default("all"),
    stage: stageFilterSchema.optional().default("all"),
    party_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
    employee_id: z.preprocess(emptyToUndefined, uuidSchema.optional()),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: value.search,
    status: value.status,
    job_type: value.job_type,
    stage: value.stage,
    party_id: value.party_id,
    employee_id: value.employee_id,
  }));

export type CreateJobInput = z.output<typeof createJobSchema>;
export type UpdateJobInput = z.output<typeof updateJobSchema>;
export type CreateSubJobInput = z.output<typeof createSubJobSchema>;
export type UpdateSubJobInput = z.output<typeof updateSubJobSchema>;
export type AddEmployeeWorkInput = z.output<typeof addEmployeeWorkSchema>;
export type UpdateEmployeeWorkInput = z.output<typeof updateEmployeeWorkSchema>;
export type AdvanceSubJobStageInput = z.output<typeof advanceSubJobStageSchema>;
export type ListJobsInput = z.output<typeof listJobsSchema>;
