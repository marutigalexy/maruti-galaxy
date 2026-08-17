import { escapeIlike } from "@/lib/api/ilike";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { selectColumns } from "@/lib/api/select";
import { AppError } from "@/lib/api/result";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateUserInput,
  ListUsersInput,
  SetUserActiveInput,
  UpdateUserPasswordInput,
  UpdateUserProfileInput,
} from "@/lib/validation/users";

export const USER_LIST_COLUMNS = selectColumns([
  "id",
  "name",
  "email",
  "role",
  "is_active",
  "created_at",
]);

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export function toPublicUser(row: UserRecord): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

async function getUserRow(id: string): Promise<UserRecord> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load user.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "User was not found.");
  }

  return toPublicUser(data);
}

export async function listUsers(input: ListUsersInput): Promise<Paginated<UserRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  const search = input.search.trim();

  let query = supabase
    .from("users")
    .select(USER_LIST_COLUMNS, { count: "exact" })
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
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load users.");
  }

  return paginated((data ?? []).map(toPublicUser), count ?? 0, input.page, input.pageSize);
}

async function rollbackAuthUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  await requireActiveAdmin();
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });

  if (createError || !created.user) {
    const message = createError?.message.toLowerCase() ?? "";
    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      throw new AppError("CONFLICT", "This email is already in use.");
    }
    throw new AppError("INTERNAL", "Unable to create user.");
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: created.user.id,
        name: input.name,
        email: input.email,
        role: "admin",
        is_active: input.is_active,
      },
      { onConflict: "id" },
    )
    .select(USER_LIST_COLUMNS)
    .single();

  if (error || !data) {
    await rollbackAuthUser(created.user.id);
    if (error?.code === "23505") {
      throw new AppError("CONFLICT", "This email is already in use.");
    }
    throw new AppError("INTERNAL", "Unable to create user.");
  }

  return toPublicUser(data);
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UserRecord> {
  await requireActiveAdmin();
  const existing = await getUserRow(input.id);
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  const emailChanged = existing.email !== input.email;

  if (emailChanged) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.id, {
      email: input.email,
      email_confirm: true,
    });

    if (authError) {
      const message = authError.message.toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        throw new AppError("CONFLICT", "This email is already in use.");
      }
      throw new AppError("INTERNAL", "Unable to update user.");
    }
  }

  const { data, error } = await supabase
    .from("users")
    .update({ name: input.name, email: input.email })
    .eq("id", input.id)
    .select(USER_LIST_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    if (emailChanged) {
      await admin.auth.admin.updateUserById(input.id, {
        email: existing.email,
        email_confirm: true,
      });
    }
    if (error?.code === "23505") {
      throw new AppError("CONFLICT", "This email is already in use.");
    }
    throw new AppError("NOT_FOUND", "User was not found.");
  }

  return toPublicUser(data);
}

export async function updateUserPassword(input: UpdateUserPasswordInput): Promise<{ ok: true }> {
  await requireActiveAdmin();
  await getUserRow(input.id);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(input.id, {
    password: input.password,
  });

  if (error) {
    throw new AppError("INTERNAL", "Unable to update password.");
  }

  return { ok: true };
}

export async function setUserActive(input: SetUserActiveInput): Promise<UserRecord> {
  const actor = await requireActiveAdmin();

  if (input.id === actor.id && !input.is_active) {
    throw new AppError("INTEGRITY", "You cannot deactivate your own account.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select(USER_LIST_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("NOT_FOUND", "User was not found.");
  }

  return toPublicUser(data);
}
