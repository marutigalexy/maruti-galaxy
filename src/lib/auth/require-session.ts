import { AppError } from "@/lib/auth/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireSession() {
  const user = await getSessionUser();

  if (!user) {
    throw new AppError("UNAUTHORIZED", "You must be signed in.");
  }

  return user;
}
