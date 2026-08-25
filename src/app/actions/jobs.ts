"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { Paginated } from "@/lib/api/pagination";
import type { ActionResult } from "@/lib/api/result";
import { parseOrThrow } from "@/lib/validation";
import {
  addEmployeeWorkSchema,
  advanceJobStageSchema,
  createJobSchema,
  createSubJobSchema,
  jobIdSchema,
  listJobsSchema,
  updateEmployeeWorkSchema,
  updateJobSchema,
  updateSubJobSchema,
  workIdSchema,
} from "@/lib/validation/jobs";
import {
  addEmployeeWork,
  advanceJobStage,
  createJob,
  createSubJob,
  deleteEmployeeWork,
  getJob,
  listJobs,
  updateEmployeeWork,
  updateJob,
  updateSubJob,
  type JobDetail,
  type JobListRecord,
} from "@/services/jobs/jobs-service";

function revalidateJobs() {
  revalidatePaths(MutationPaths.jobs);
  revalidatePath("/jobs", "layout");
  revalidatePath("/employees", "layout");
  revalidatePath("/parties", "layout");
}

export async function listJobsAction(
  input: unknown,
): Promise<ActionResult<Paginated<JobListRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listJobsSchema, input);
    return listJobs(parsed);
  });
}

export async function getJobAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(jobIdSchema, input);
    return getJob(parsed.id);
  });
}

export async function createJobAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createJobSchema, input);
    const job = await createJob(parsed);
    revalidateJobs();
    return job;
  });
}

export async function updateJobAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateJobSchema, input);
    const job = await updateJob(parsed);
    revalidateJobs();
    return job;
  });
}

export async function createSubJobAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createSubJobSchema, input);
    const job = await createSubJob(parsed);
    revalidateJobs();
    return job;
  });
}

export async function updateSubJobAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateSubJobSchema, input);
    const job = await updateSubJob(parsed);
    revalidateJobs();
    return job;
  });
}

export async function addEmployeeWorkAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(addEmployeeWorkSchema, input);
    const job = await addEmployeeWork(parsed);
    revalidateJobs();
    return job;
  });
}

export async function updateEmployeeWorkAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateEmployeeWorkSchema, input);
    const job = await updateEmployeeWork(parsed);
    revalidateJobs();
    return job;
  });
}

export async function deleteEmployeeWorkAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(workIdSchema, input);
    const job = await deleteEmployeeWork(parsed.id);
    revalidateJobs();
    return job;
  });
}

export async function advanceJobStageAction(input: unknown): Promise<ActionResult<JobDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(advanceJobStageSchema, input);
    const job = await advanceJobStage(parsed);
    revalidateJobs();
    return job;
  });
}

