"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LOGIN_PATH } from "@/lib/auth/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SessionExpiryWatcher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace(LOGIN_PATH);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
