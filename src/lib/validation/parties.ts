import { z } from "zod";

import {
  listQuerySchema,
  mobileSchema,
  moneySchema,
  optionalTextSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

export const partyCompanyNameSchema = z
  .string()
  .trim()
  .min(1, "Company Name is required.")
  .max(200, "Company Name is limited to 200 characters.");

export const createPartySchema = z.object({
  company_name: partyCompanyNameSchema,
  contact_person_name: optionalTextSchema.optional().transform((value) => value ?? null),
  mobile_number: mobileSchema,
  price: moneySchema,
  is_active: z.boolean().optional().default(true),
});

export const updatePartySchema = z.object({
  id: uuidSchema,
  company_name: partyCompanyNameSchema,
  contact_person_name: optionalTextSchema.optional().transform((value) => value ?? null),
  mobile_number: mobileSchema,
  price: moneySchema,
});

export const setPartyActiveSchema = z.object({
  id: uuidSchema,
  is_active: z.boolean(),
});

export const partyIdSchema = z.object({
  id: uuidSchema,
});

export const listPartiesSchema = listQuerySchema;

export type CreatePartyInput = z.output<typeof createPartySchema>;
export type UpdatePartyInput = z.output<typeof updatePartySchema>;
export type SetPartyActiveInput = z.output<typeof setPartyActiveSchema>;
export type ListPartiesInput = z.output<typeof listPartiesSchema>;
