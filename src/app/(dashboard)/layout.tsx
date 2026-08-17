import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserAction } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SessionExpiryWatcher } from "@/components/auth/session-expiry-watcher";
import { isAppError } from "@/lib/auth/errors";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let name = "";
  let email = "";
  let role = "admin";

  try {
    const user = await getCurrentUserAction();
    name = user.name;
    email = user.email;
    role = user.role;
  } catch (error) {
    if (isAppError(error) && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
      redirect(LOGIN_PATH);
    }
    throw error;
  }

  return (
    <>
      <SessionExpiryWatcher />
      <AppShell name={name} email={email} role={role}>
        {children}
      </AppShell>
    </>
  );
}
