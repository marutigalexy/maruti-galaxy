"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import type { Paginated } from "@/lib/api/pagination";
import { parseOrThrow } from "@/lib/validation";
import {
  categoryIdSchema,
  createCategorySchema,
  listCategoriesSchema,
  setCategoryActiveSchema,
  updateCategorySchema,
} from "@/lib/validation/categories";
import {
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
  type CategoryRecord,
} from "@/services/categories/categories-service";

function revalidateCategories() {
  revalidatePaths(MutationPaths.accounting);
  revalidatePath("/accounting", "layout");
}

export async function listCategoriesAction(
  input: unknown,
): Promise<ActionResult<Paginated<CategoryRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listCategoriesSchema, input);
    return listCategories(parsed);
  });
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<CategoryRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createCategorySchema, input);
    const category = await createCategory(parsed);
    revalidateCategories();
    return category;
  });
}

export async function updateCategoryAction(
  input: unknown,
): Promise<ActionResult<CategoryRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateCategorySchema, input);
    const category = await updateCategory(parsed);
    revalidateCategories();
    return category;
  });
}

export async function setCategoryActiveAction(
  input: unknown,
): Promise<ActionResult<CategoryRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(setCategoryActiveSchema, input);
    const category = await setCategoryActive(parsed);
    revalidateCategories();
    return category;
  });
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(categoryIdSchema, input);
    const result = await deleteCategory(parsed.id);
    revalidateCategories();
    return result;
  });
}
