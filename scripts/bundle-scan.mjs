#!/usr/bin/env node
/**
 * SEC-009: Fail CI if the client bundle contains the service-role secret.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATIC_DIR = path.join(ROOT, ".next", "static");
const failures = [];

if (!existsSync(STATIC_DIR)) {
  console.error("Bundle scan requires a production build (.next/static). Run npm run build first.");
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const files = walk(STATIC_DIR).filter((file) => /\.(js|json|html|css|map)$/.test(file));

for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/.test(content)) {
    failures.push(`${relative}: client bundle exposes a NEXT_PUBLIC service-role name`);
  }
  if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    failures.push(`${relative}: client bundle contains SUPABASE_SERVICE_ROLE_KEY`);
  }
  if (serviceRole && serviceRole.length >= 16 && content.includes(serviceRole)) {
    failures.push(`${relative}: client bundle contains the live service-role key`);
  }
}

if (failures.length > 0) {
  console.error("Bundle secret scan failed:\n");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("Bundle secret scan passed: no service-role material in .next/static.");
