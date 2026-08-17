import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import { getPublicSupabaseEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

const cookieOptions = sessionCookieOptions();

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; proxy refreshes the session.
        }
      },
    },
  });
}
