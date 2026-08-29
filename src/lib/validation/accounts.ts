import { z } from "zod";

import {
  listQuerySchema,
  optionalSignedMoneySchema,
  signedMoneySchema,
  uuidSchema,
} from "@/lib/validation/schemas";

export const accountNameSchema = z
  .string()
  .trim()
  .min(1, "Account Name is required.")
  .max(200, "Account Name is limited to 200 characters.");

export const createAccountSchema = z.object({
  name: accountNameSchema,
  opening_balance: optionalSignedMoneySchema.optional().default("0.00"),
  is_active: z.boolean().optional().default(true),
});

export const updateAccountSchema = z.object({
  id: uuidSchema,
  name: accountNameSchema,
  opening_balance: signedMoneySchema,
});

export const setAccountActiveSchema = z.object({
  id: uuidSchema,
  is_active: z.boolean(),
});

export const accountIdSchema = z.object({
  id: uuidSchema,
});

export const listAccountsSchema = listQuerySchema;

export type CreateAccountInput = z.output<typeof createAccountSchema>;
export type UpdateAccountInput = z.output<typeof updateAccountSchema>;
export type SetAccountActiveInput = z.output<typeof setAccountActiveSchema>;
export type ListAccountsInput = z.output<typeof listAccountsSchema>;
