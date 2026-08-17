import { escapeIlike } from "@/lib/api/ilike";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { isRestrictViolation, isUniqueViolation } from "@/lib/api/postgres";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateCategoryInput,
  ListCategoriesInput,
  SetCategoryActiveInput,
  UpdateCategoryInput,
} from "@/lib/validation/categories";
import type { Database } from "@/types/database";

export const CATEGORY_LIST_COLUMNS = selectColumns([
  "id",
  "name",
  "type",
  "is_active",
  "created_at",
]);

export type CategoryRecord = {
  id: string;
  name: string;
  type: Database["public"]["Enums"]["entry_type"];
  is_active: boolean;
  created_at: string;
  entry_count: number;
};

function toCategory(
  row: {
    id: string;
    name: string;
    type: Database["public"]["Enums"]["entry_type"];
    is_active: boolean;
    created_at: string;
  },
  entryCount = 0,
): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    is_active: row.is_active,
    created_at: row.created_at,
    entry_count: entryCount,
  };
}

function throwCategoryWriteError(error: unknown, fallback: string): never {
  if (isUniqueViolation(error)) {
    throw new AppError("CONFLICT", "A category with this name and type already exists.");
  }
  if (isRestrictViolation(error)) {
    throw new AppError("INTEGRITY", "This category has entries and cannot be deleted.");
  }
  throw new AppError("INTERNAL", fallback);
}

async function entryCountsFor(
  ids: string[],
): Promise<Map<string, number>> {
  const counts = new Map(ids.map((id) => [id, 0]));
  if (ids.length === 0) {
    return counts;
  }

  const supabase = await createSupabaseServerClient();
  await Promise.all(
    ids.map(async (id) => {
      const { count, error } = await supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);

      if (!error) {
        counts.set(id, count ?? 0);
      }
    }),
  );

  return counts;
}

export async function listCategories(input: ListCategoriesInput): Promise<Paginated<CategoryRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  const search = input.search.trim();

  let query = supabase
    .from("categories")
    .select(CATEGORY_LIST_COLUMNS, { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + input.pageSize - 1);

  if (input.status === "active") {
    query = query.eq("is_active", true);
  }

  if (input.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (search !== "") {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.ilike("name", pattern);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load categories.");
  }

  const rows = data ?? [];
  const counts = await entryCountsFor(rows.map((row) => row.id));

  return paginated(
    rows.map((row) => toCategory(row, counts.get(row.id) ?? 0)),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getCategory(id: string): Promise<CategoryRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load category.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Category was not found.");
  }

  const counts = await entryCountsFor([id]);
  return toCategory(data, counts.get(id) ?? 0);
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      type: input.type,
      is_active: input.is_active,
    })
    .select(CATEGORY_LIST_COLUMNS)
    .single();

  if (error || !data) {
    throwCategoryWriteError(error, "Unable to create category.");
  }

  return toCategory(data, 0);
}

export async function updateCategory(input: UpdateCategoryInput): Promise<CategoryRecord> {
  await requireActiveAdmin();
  const existing = await getCategory(input.id);

  if (existing.type !== input.type && existing.entry_count > 0) {
    throw new AppError(
      "INTEGRITY",
      "This category type cannot be changed because it has entries.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      type: input.type,
    })
    .eq("id", input.id)
    .select(CATEGORY_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throwCategoryWriteError(error, "Unable to update category.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Category was not found.");
  }

  return toCategory(data, existing.entry_count);
}

export async function setCategoryActive(input: SetCategoryActiveInput): Promise<CategoryRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select(CATEGORY_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update category.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Category was not found.");
  }

  const counts = await entryCountsFor([input.id]);
  return toCategory(data, counts.get(input.id) ?? 0);
}

export async function deleteCategory(id: string): Promise<{ ok: true }> {
  await requireActiveAdmin();
  const existing = await getCategory(id);
  if (existing.entry_count > 0) {
    throw new AppError("INTEGRITY", "This category has entries and cannot be deleted.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throwCategoryWriteError(error, "Unable to delete category.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Category was not found.");
  }

  return { ok: true };
}

export type CategoryOption = {
  id: string;
  name: string;
  type: Database["public"]["Enums"]["entry_type"];
  is_active: boolean;
};

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL", "Unable to load categories.");
  }

  return data ?? [];
}
