import "server-only";

import { getPublicSupabaseEnv } from "@/lib/env/public";

export type ServerSupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function getServerSupabaseEnv(): ServerSupabaseEnv {
  const publicEnv = getPublicSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (serviceRoleKey === publicEnv.anonKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must not equal the anon key.");
  }

  return {
    url: publicEnv.url,
    anonKey: publicEnv.anonKey,
    serviceRoleKey,
  };
}
