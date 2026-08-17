#!/usr/bin/env node
/**
 * AUTH-011: Create the first Auth user and matching public.users row.
 * Uses the service-role key on the server/operator machine only.
 *
 * Usage:
 *   BOOTSTRAP_ADMIN_NAME="Admin" \
 *   BOOTSTRAP_ADMIN_EMAIL="admin@example.com" \
 *   BOOTSTRAP_ADMIN_PASSWORD="choose-a-strong-password" \
 *   node scripts/bootstrap-admin.mjs
 *
 * Reads .env.local if present. Never logs the password.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const name = (process.env.BOOTSTRAP_ADMIN_NAME ?? "").trim();
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!name || !email || !password) {
  console.error("Missing BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, or BOOTSTRAP_ADMIN_PASSWORD.");
  process.exit(1);
}

if (!email.includes("@")) {
  console.error("BOOTSTRAP_ADMIN_EMAIL is not a valid email.");
  process.exit(1);
}

if (password.length < 6) {
  console.error("BOOTSTRAP_ADMIN_PASSWORD is too short.");
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = parsedUrl.hostname.toLowerCase();
const isLocal = host === "127.0.0.1" || host === "localhost";
if (!isLocal && process.env.MARUTI_BOOTSTRAP_CONFIRM !== "YES") {
  console.error("Non-local bootstrap requires MARUTI_BOOTSTRAP_CONFIRM=YES.");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});

if (createError || !created.user) {
  console.error("Auth user creation failed.");
  process.exit(1);
}

const { error: insertError } = await admin.from("users").upsert(
  {
    id: created.user.id,
    name,
    email,
    role: "admin",
    is_active: true,
  },
  { onConflict: "id" },
);

if (insertError) {
  const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
  if (deleteError) {
    console.error("users insert failed, and Auth user compensation also failed.");
    process.exit(1);
  }
  console.error("users insert failed; Auth user was removed.");
  process.exit(1);
}

console.log(`Bootstrap admin created for ${email}.`);
