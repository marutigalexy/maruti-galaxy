#!/usr/bin/env node
/**
 * OPS-002: repository production-isolation preflight.
 * Does not create a hosted project and does not adopt R-17 vendors.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

function read(relative) {
  const full = path.join(ROOT, relative);
  if (!existsSync(full)) {
    failures.push(`Missing ${relative}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustExist(relative) {
  if (!existsSync(path.join(ROOT, relative))) {
    failures.push(`Missing ${relative}`);
  }
}

function mustMatch(relative, pattern, label) {
  const content = read(relative);
  if (content && !pattern.test(content)) {
    failures.push(`${relative}: missing ${label}`);
  }
}

mustExist("supabase/migrations/migration_01.sql");
mustExist("supabase/migrations/migration_02.sql");
mustExist("supabase/migrations/migration_03.sql");
mustExist("supabase/migrations/migration_04.sql");
mustExist("docs/PRODUCTION_RUNBOOK.md");
mustExist("docs/environments.md");

mustMatch("docs/environments.md", /maruti-galaxy-prod/, "isolated prod project name");
mustMatch("docs/environments.md", /maruti-galaxy-staging/, "isolated staging project name");
mustMatch("docs/PRODUCTION_RUNBOOK.md", /\[DECISION REQUIRED\] R-17/, "R-17 left open");
mustMatch("docs/PRODUCTION_RUNBOOK.md", /Do not reuse local or staging/, "isolation rule");
mustMatch(
  "supabase/seeds/seed_staging_volume.sql",
  /SEED_VOLUME_FORBIDDEN_IN_PRODUCTION/,
  "production seed abort",
);
mustMatch(
  "supabase/seeds/seed_staging_volume.sql",
  /maruti\.environment/,
  "production environment GUC",
);
mustMatch("scripts/bootstrap-admin.mjs", /MARUTI_BOOTSTRAP_CONFIRM/, "non-local bootstrap confirm");
mustMatch("supabase/config.toml", /enable_signup = false/, "signup disabled locally");
mustMatch("src/lib/security/headers.ts", /Strict-Transport-Security/, "HSTS in production headers");
mustMatch("src/lib/api/logging.ts", /REDACTED/, "log redaction");
mustMatch(".gitignore", /^\.env$/m, ".env gitignore");
mustMatch(".env.example", /SUPABASE_SERVICE_ROLE_KEY/, "server-only key documented");
mustMatch(".env.example", /SERVER-ONLY/, "service-role marked server-only");

const vendorFiles = ["vercel.json", "Dockerfile", "fly.toml", "netlify.toml", "railway.toml"];
for (const file of vendorFiles) {
  if (existsSync(path.join(ROOT, file))) {
    failures.push(`${file}: hosting vendor file present before R-17 is accepted`);
  }
}

const apiDir = path.join(ROOT, "src/app/api");
if (existsSync(apiDir)) {
  const routes = [];
  function walk(dir, parts = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), [...parts, entry.name]);
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        routes.push([...parts, entry.name].join("/"));
      }
    }
  }
  walk(apiDir);
  const allowed = new Set(["export/entries/route.ts"]);
  for (const route of routes) {
    if (!allowed.has(route)) {
      failures.push(`src/app/api/${route}: unexpected API route (no debug endpoints)`);
    }
  }
  if (!routes.includes("export/entries/route.ts")) {
    failures.push("missing GET /api/export/entries");
  }
} else {
  failures.push("missing src/app/api");
}

if (failures.length > 0) {
  console.error("OPS-002 preflight failed:\n");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("OPS-002 repository preflight passed.");
console.log("Live production Supabase project is not created by this check.");
console.log("[DECISION REQUIRED] R-17 hosting/backup/monitoring before OPS-005/006/009.");
