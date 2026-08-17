import { z } from "zod";

import { listQuerySchema, uuidSchema } from "@/lib/validation/schemas";

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category Name is required.")
  .max(200, "Category Name is limited to 200 characters.");

export const categoryTypeSchema = z.enum(["Income", "Expense"]);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  type: categoryTypeSchema,
  is_active: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  id: uuidSchema,
  name: categoryNameSchema,
  type: categoryTypeSchema,
});

export const setCategoryActiveSchema = z.object({
  id: uuidSchema,
  is_active: z.boolean(),
});

export const categoryIdSchema = z.object({
  id: uuidSchema,
});

export const listCategoriesSchema = listQuerySchema;

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
export type SetCategoryActiveInput = z.output<typeof setCategoryActiveSchema>;
export type ListCategoriesInput = z.output<typeof listCategoriesSchema>;
