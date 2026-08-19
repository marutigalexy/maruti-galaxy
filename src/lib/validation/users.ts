import { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import {
  pageSchema,
  pageSizeSchema,
  searchSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

export const userNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is limited to 100 characters.");

export const userEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is limited to 254 characters.")
  .email("Enter a valid email address.");

export const userPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(72, "Password is too long.");

export const createUserSchema = z
  .object({
    name: userNameSchema,
    email: userEmailSchema,
    password: userPasswordSchema,
    confirmPassword: z.string(),
    is_active: z.boolean().optional().default(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password and confirmation do not match.",
    path: ["confirmPassword"],
  });

export const updateUserPasswordSchema = z
  .object({
    id: uuidSchema,
    password: userPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password and confirmation do not match.",
    path: ["confirmPassword"],
  });

export const updateUserProfileSchema = z.object({
  id: uuidSchema,
  name: userNameSchema,
  email: userEmailSchema,
});

export const setUserActiveSchema = z.object({
  id: uuidSchema,
  is_active: z.boolean(),
});

export const listUsersSchema = z
  .object({
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.preprocess((value) => value ?? "", searchSchema),
    status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  })
  .transform((value) => ({
    page: value.page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: value.search,
    status: value.status,
  }));

export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserPasswordInput = z.output<typeof updateUserPasswordSchema>;
export type UpdateUserProfileInput = z.output<typeof updateUserProfileSchema>;
export type SetUserActiveInput = z.output<typeof setUserActiveSchema>;
export type ListUsersInput = z.output<typeof listUsersSchema>;
