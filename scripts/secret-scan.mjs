#!/usr/bin/env node
/**
 * FOUND-009: Fail CI if service-role or other secrets can leak to the client.
 * Allowed: documenting SUPABASE_SERVICE_ROLE_KEY in .env.example, README, and docs.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

const SKIP_DIR_NAMES = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "out",
  "build",
  "test-results",
  "playwright-report",
  "blob-report",
]);

const ALLOW_SERVICE_ROLE_DOCS = new Set([
  ".env.example",
  "README.md",
  "docs/environments.md",
  "docs/IMPLEMENTATION_STATUS.md",
  "scripts/secret-scan.mjs",
  ".github/workflows/ci.yml",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function isClientSource(content) {
  const head = content.slice(0, 400);
  return (
    head.includes('"use client"') ||
    head.includes("'use client'") ||
    head.includes('"use client";') ||
    head.includes("'use client';")
  );
}

function gitTrackedFiles() {
  try {
    const out = execFileSync("git", ["ls-files"], { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

const forbiddenTracked = [
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
  ".env.staging.local",
];

const tracked = gitTrackedFiles();
if (tracked) {
  for (const file of tracked) {
    if (forbiddenTracked.includes(file) || file.endsWith(".local")) {
      failures.push(`Secret env file is tracked by git: ${file}`);
    }
  }
} else {
  console.warn("git is not initialized; skipped tracked-file secret check.");
}

const files = walk(ROOT);

for (const file of files) {
  const relative = rel(file);
  if (relative.endsWith(".png") || relative.endsWith(".jpg") || relative.endsWith(".webp")) {
    continue;
  }

  const base = path.basename(relative);
  if (base === ".env" || (base.startsWith(".env.") && base !== ".env.example")) {
    continue;
  }

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/.test(content)) {
    failures.push(`${relative}: service-role must not use NEXT_PUBLIC_`);
  }

  const mentionsServiceRole =
    content.includes("SUPABASE_SERVICE_ROLE_KEY") ||
    content.includes("SERVICE_ROLE_KEY") ||
    /service[_-]?role/i.test(content);

  if (mentionsServiceRole && relative.startsWith("src/")) {
    if (isClientSource(content)) {
      failures.push(`${relative}: client module references service-role secret`);
    }
  }

  if (mentionsServiceRole && !relative.startsWith("src/")) {
    if (
      !ALLOW_SERVICE_ROLE_DOCS.has(relative) &&
      !relative.startsWith("docs/") &&
      !relative.startsWith("supabase/") &&
      !relative.endsWith(".md")
    ) {
      // Application code outside src that is not docs/scripts
      if (relative.startsWith("scripts/") === false) {
        failures.push(`${relative}: unexpected service-role reference`);
      }
    }
  }

  if (isClientSource(content) && /SERVICE_ROLE/.test(content)) {
    failures.push(`${relative}: SERVICE_ROLE found in a Client Component`);
  }
}

if (existsSync(path.join(ROOT, ".env.example"))) {
  const example = readFileSync(path.join(ROOT, ".env.example"), "utf8");
  if (/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/.test(example)) {
    failures.push(".env.example exposes service-role as NEXT_PUBLIC_");
  }
  if (
    !example.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    !example.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ) {
    failures.push(".env.example must document public Supabase URL and anon key");
  }
  if (!example.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    failures.push(".env.example must document server-only SUPABASE_SERVICE_ROLE_KEY");
  }
} else {
  failures.push("Missing .env.example");
}

if (failures.length > 0) {
  console.error("Secret scan failed:\n");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("Secret scan passed: no client service-role leak; env example is public+documented server key only.");
