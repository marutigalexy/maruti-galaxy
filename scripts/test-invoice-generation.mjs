/**
 * test-invoice-generation.mjs
 *
 * Integration test: verifies that Generate Invoice creates an invoice
 * containing ONLY the explicitly selected job(s), not all pending jobs.
 *
 * Prerequisites:
 *   - migrations 01-07 applied to the target DB
 *   - .env (or .env.local) contains SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 *
 * Run:
 *   node scripts/test-invoice-generation.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load env ─────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
let envText = "";
try { envText = readFileSync(envPath, "utf8"); } catch { /* no .env */ }
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const ERRORS = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
    ERRORS.push(label);
  }
}

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw Object.assign(new Error(error.message), { pgError: error });
  return data;
}

// ── Setup: create an isolated test party ─────────────────────────────────────
async function setup() {
  const { data: party, error } = await sb
    .from("parties")
    .insert({ company_name: `TEST_PARTY_${Date.now()}`, mobile_number: "0000000000", price: 1000 })
    .select("id")
    .single();
  if (error) throw error;
  return party.id;
}

// ── Teardown ──────────────────────────────────────────────────────────────────
async function teardown(partyId) {
  // Remove in FK-safe order
  const { data: jobRows } = await sb.from("job_works").select("id").eq("party_id", partyId);
  const jobIds = (jobRows ?? []).map((r) => r.id);

  if (jobIds.length > 0) {
    const { data: invRows } = await sb.from("invoices").select("id").in("job_work_id", jobIds);
    const invIds = (invRows ?? []).map((r) => r.id);
    if (invIds.length > 0) {
      await sb.from("invoice_jobs").delete().in("invoice_id", invIds);
      await sb.from("invoices").delete().in("id", invIds);
    }
    await sb.from("job_works").delete().in("id", jobIds);
  }
  await sb.from("parties").delete().eq("id", partyId);
}

// ── Create job via RPC ────────────────────────────────────────────────────────
async function createJob(partyId, price, billingAmount = null) {
  const rows = await rpc("create_job", {
    p_party_id:    partyId,
    p_job_type:    "Sarin",
    p_than:        10,
    p_price:       price,
    p_kapan_number: `KAP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    p_weight:      1,
    p_status:      "Pending",
  });
  const jobId = rows[0].job_id;

  if (billingAmount !== null) {
    await rpc("update_job_billing_amount", {
      p_job_id: jobId,
      p_billing_amount: billingAmount,
    });
  }
  return jobId;
}

// ── Main test ─────────────────────────────────────────────────────────────────
async function runTest() {
  console.log("\n=== Invoice Generation Isolation Test ===\n");

  let partyId;
  try {
    partyId = await setup();
    console.log(`Test party: ${partyId}\n`);

    // Create 3 pending jobs with distinct billing amounts
    const jobA = await createJob(partyId, 500,  5000);   // billing = 5000
    const jobB = await createJob(partyId, 1000, 10000);  // billing = 10000
    const jobC = await createJob(partyId, 1500, 15000);  // billing = 15000

    console.log(`Job A (₹5 000): ${jobA}`);
    console.log(`Job B (₹10 000): ${jobB}`);
    console.log(`Job C (₹15 000): ${jobC}`);
    console.log();

    // ── TEST 1: Select only Job A ──────────────────────────────────────────
    console.log("Test 1 — Generate invoice for Job A only");

    const today = new Date().toISOString().slice(0, 10);
    const invRows = await rpc("create_invoice_for_jobs", {
      p_party_id:    partyId,
      p_job_ids:    [jobA],
      p_invoice_date: today,
    });
    const inv = invRows[0];

    assert(!!inv.invoice_id,      "Invoice was created");
    assert(Number(inv.amount) === 5000, `Invoice amount = 5000 (got ${inv.amount})`);

    // Verify invoice_jobs contains ONLY Job A
    const { data: ijRows } = await sb
      .from("invoice_jobs")
      .select("job_work_id")
      .eq("invoice_id", inv.invoice_id);

    const linkedIds = (ijRows ?? []).map((r) => r.job_work_id);
    assert(linkedIds.length === 1,        "invoice_jobs has exactly 1 row");
    assert(linkedIds.includes(jobA),      "invoice_jobs contains Job A");
    assert(!linkedIds.includes(jobB),     "invoice_jobs does NOT contain Job B");
    assert(!linkedIds.includes(jobC),     "invoice_jobs does NOT contain Job C");

    // Verify the stored invoice amount matches Job A billing only
    const { data: invoiceRow } = await sb
      .from("invoices")
      .select("amount, job_work_id")
      .eq("id", inv.invoice_id)
      .single();

    assert(Number(invoiceRow.amount) === 5000, `DB invoice.amount = 5000 (got ${invoiceRow.amount})`);
    assert(invoiceRow.job_work_id === jobA,    "DB invoice.job_work_id = Job A");

    // ── TEST 2: Job B and C remain uninvoiced ──────────────────────────────
    console.log("\nTest 2 — Job B and Job C remain uninvoiced");

    const { data: uninvoiced } = await sb
      .from("invoice_jobs")
      .select("job_work_id")
      .in("job_work_id", [jobB, jobC]);

    assert((uninvoiced ?? []).length === 0,    "Job B has no invoice_jobs row");

    const { data: uninvoicedDirect } = await sb
      .from("invoices")
      .select("id")
      .in("job_work_id", [jobB, jobC]);

    assert((uninvoicedDirect ?? []).length === 0, "Job B and C have no invoices row");

    // ── TEST 3: Generate invoice for Job B + Job C together ────────────────
    console.log("\nTest 3 — Generate invoice for Job B + Job C together");

    const invRows2 = await rpc("create_invoice_for_jobs", {
      p_party_id:    partyId,
      p_job_ids:    [jobB, jobC],
      p_invoice_date: today,
    });
    const inv2 = invRows2[0];

    assert(!!inv2.invoice_id,                     "Second invoice was created");
    assert(Number(inv2.amount) === 25000,          `Invoice amount = 25000 (B+C) (got ${inv2.amount})`);

    const { data: ijRows2 } = await sb
      .from("invoice_jobs")
      .select("job_work_id")
      .eq("invoice_id", inv2.invoice_id);

    const linkedIds2 = (ijRows2 ?? []).map((r) => r.job_work_id);
    assert(linkedIds2.length === 2,                "invoice_jobs has exactly 2 rows");
    assert(linkedIds2.includes(jobB),              "invoice_jobs contains Job B");
    assert(linkedIds2.includes(jobC),              "invoice_jobs contains Job C");
    assert(!linkedIds2.includes(jobA),             "invoice_jobs does NOT contain Job A");

    // ── TEST 4: Re-invoicing Job A must fail ───────────────────────────────
    console.log("\nTest 4 — Attempting to re-invoice Job A must fail");

    let duplicateError = null;
    try {
      await rpc("create_invoice_for_jobs", {
        p_party_id:    partyId,
        p_job_ids:    [jobA],
        p_invoice_date: today,
      });
    } catch (err) {
      duplicateError = err;
    }
    assert(duplicateError !== null, "Re-invoicing Job A raises an error");
    assert(
      duplicateError?.pgError?.message === "INVOICE_ALREADY_EXISTS",
      `Error is INVOICE_ALREADY_EXISTS (got: ${duplicateError?.pgError?.message})`,
    );

    // ── TEST 5: No data from Job B/C appears in first invoice ─────────────
    console.log("\nTest 5 — First invoice contains no data from Job B or C");

    const { data: allLinks } = await sb
      .from("invoice_jobs")
      .select("job_work_id")
      .eq("invoice_id", inv.invoice_id);

    const firstInvJobs = (allLinks ?? []).map((r) => r.job_work_id);
    assert(!firstInvJobs.includes(jobB), "First invoice has no link to Job B");
    assert(!firstInvJobs.includes(jobC), "First invoice has no link to Job C");

    const { data: firstInvRecord } = await sb
      .from("invoices")
      .select("amount")
      .eq("id", inv.invoice_id)
      .single();

    assert(
      Number(firstInvRecord.amount) === 5000,
      `First invoice amount still 5000, not contaminated by B/C (got ${firstInvRecord.amount})`,
    );

  } finally {
    if (partyId) {
      await teardown(partyId);
      console.log("\nTest data cleaned up.");
    }
  }
}

runTest()
  .then(() => {
    console.log(`\n${"─".repeat(44)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      console.error("FAILED assertions:");
      for (const e of ERRORS) console.error(`  • ${e}`);
      process.exit(1);
    } else {
      console.log("All tests passed ✓");
    }
  })
  .catch((err) => {
    console.error("\nTest crashed:", err);
    process.exit(1);
  });
