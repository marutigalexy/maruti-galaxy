import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserAction } from "@/app/actions/auth";
import { SessionExpiryWatcher } from "@/components/auth/session-expiry-watcher";
import { isAppError } from "@/lib/auth/errors";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: ReactNode }) {
  try {
    await getCurrentUserAction();
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
      {children}
    </>
  );
}
