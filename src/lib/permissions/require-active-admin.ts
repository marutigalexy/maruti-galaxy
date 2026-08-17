import { selectColumns } from "@/lib/api/select";
import { AppError } from "@/lib/auth/errors";
import {
  INACTIVE_ACCOUNT_ERROR,
  UNAUTHORIZED_ACCOUNT_ERROR,
} from "@/lib/auth/login-errors";
import { requireSession } from "@/lib/auth/require-session";
import { evaluateAccess, type AppUser } from "@/lib/permissions/evaluate-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const USER_COLUMNS = selectColumns(["id", "name", "email", "role", "is_active"]);

export async function requireActiveAdmin(): Promise<AppUser> {
  const sessionUser = await requireSession();
  const admin = createSupabaseAdminClient();

  // Service-role read of the caller's own profile. RLS hides inactive rows from
  // the user-scoped client, so this check cannot use the anon/JWT client.

  const { data, error } = await admin
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", sessionUser.id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to verify account access.");
  }

  const decision = evaluateAccess(data);

  if (decision.status === "missing") {
    throw new AppError("FORBIDDEN", UNAUTHORIZED_ACCOUNT_ERROR);
  }

  if (decision.status === "inactive") {
    throw new AppError("FORBIDDEN", INACTIVE_ACCOUNT_ERROR);
  }

  if (decision.status === "forbidden") {
    throw new AppError("FORBIDDEN", UNAUTHORIZED_ACCOUNT_ERROR);
  }

  return decision.user;
}
