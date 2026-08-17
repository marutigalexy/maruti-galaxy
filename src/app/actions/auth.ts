"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { revalidateAuthSession } from "@/lib/api/revalidate";
import { isAppError } from "@/lib/auth/errors";
import {
  GENERIC_LOGIN_ERROR,
  INACTIVE_ACCOUNT_ERROR,
  UNAUTHORIZED_ACCOUNT_ERROR,
  mapLoginFailure,
} from "@/lib/auth/login-errors";
import { LOGIN_PATH, postLoginPath } from "@/lib/auth/paths";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import {
  RATE_LIMIT_MESSAGE,
  clientIpFromHeaders,
  consumeLoginRateLimit,
} from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const ip = clientIpFromHeaders(await headers());
  if (!consumeLoginRateLimit(ip).allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapLoginFailure() };
  }

  try {
    await requireActiveAdmin();
  } catch (caught) {
    await supabase.auth.signOut();

    if (isAppError(caught) && caught.message === INACTIVE_ACCOUNT_ERROR) {
      return { error: INACTIVE_ACCOUNT_ERROR };
    }

    if (isAppError(caught) && caught.code === "FORBIDDEN") {
      return { error: UNAUTHORIZED_ACCOUNT_ERROR };
    }

    return { error: GENERIC_LOGIN_ERROR };
  }

  revalidateAuthSession();
  redirect(postLoginPath(next));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidateAuthSession();
  redirect(LOGIN_PATH);
}

export async function getCurrentUserAction() {
  return requireActiveAdmin();
}
