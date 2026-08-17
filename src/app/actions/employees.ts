"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import type { Paginated } from "@/lib/api/pagination";
import { parseOrThrow } from "@/lib/validation";
import {
  createEmployeeSchema,
  employeeIdSchema,
  listEmployeesSchema,
  setEmployeeActiveSchema,
  updateEmployeeSchema,
} from "@/lib/validation/employees";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  setEmployeeActive,
  updateEmployee,
  type EmployeeRecord,
} from "@/services/employees/employees-service";

function revalidateEmployees() {
  revalidatePaths(MutationPaths.employees);
  revalidatePath("/employees", "layout");
}

export async function listEmployeesAction(
  input: unknown,
): Promise<ActionResult<Paginated<EmployeeRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listEmployeesSchema, input);
    return listEmployees(parsed);
  });
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult<EmployeeRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createEmployeeSchema, input);
    const employee = await createEmployee(parsed);
    revalidateEmployees();
    return employee;
  });
}

export async function updateEmployeeAction(input: unknown): Promise<ActionResult<EmployeeRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateEmployeeSchema, input);
    const employee = await updateEmployee(parsed);
    revalidateEmployees();
    return employee;
  });
}

export async function setEmployeeActiveAction(
  input: unknown,
): Promise<ActionResult<EmployeeRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(setEmployeeActiveSchema, input);
    const employee = await setEmployeeActive(parsed);
    revalidateEmployees();
    return employee;
  });
}

export async function deleteEmployeeAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(employeeIdSchema, input);
    const result = await deleteEmployee(parsed.id);
    revalidateEmployees();
    return result;
  });
}
