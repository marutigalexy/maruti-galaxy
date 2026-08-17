import { z } from "zod";

import {
  listQuerySchema,
  mobileSchema,
  moneySchema,
  uuidSchema,
} from "@/lib/validation/schemas";

export const employeeNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is limited to 100 characters.");

export const createEmployeeSchema = z.object({
  name: employeeNameSchema,
  mobile_number: mobileSchema,
  commission: moneySchema,
  is_active: z.boolean().optional().default(true),
});

export const updateEmployeeSchema = z.object({
  id: uuidSchema,
  name: employeeNameSchema,
  mobile_number: mobileSchema,
  commission: moneySchema,
});

export const setEmployeeActiveSchema = z.object({
  id: uuidSchema,
  is_active: z.boolean(),
});

export const employeeIdSchema = z.object({
  id: uuidSchema,
});

export const listEmployeesSchema = listQuerySchema;

export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;
export type SetEmployeeActiveInput = z.output<typeof setEmployeeActiveSchema>;
export type ListEmployeesInput = z.output<typeof listEmployeesSchema>;
