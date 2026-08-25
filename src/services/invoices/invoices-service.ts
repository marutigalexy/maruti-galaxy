import { generateXlsx, type XlsxColumn } from "@/lib/api/xlsx";
import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreateInvoiceInput, ListInvoicesInput } from "@/lib/validation/invoices";
import { EXPORT_REPORT_MAX_ROWS } from "@/lib/validation/reports";
import type { Database } from "@/types/database";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
type JobType = Database["public"]["Enums"]["job_type"];

const OUTSTANDING_COLUMNS = selectColumns([
  "invoice_id",
  "invoice_number",
  "job_work_id",
  "invoice_date",
  "amount",
  "allocated",
  "outstanding",
  "derived_status",
  "stored_status",
]);

const JOB_COLUMNS = selectColumns([
  "id",
  "lot_number",
  "party_id",
  "job_type",
  "than",
  "price",
  "billing_amount",
  "kapan_number",
  "weight",
  "created_at",
]);

const ALLOCATION_COLUMNS = selectColumns(["id", "entry_id", "amount", "created_at"]);
const ENTRY_COLUMNS = selectColumns(["id", "entry_date", "amount", "remarks"]);

export type InvoiceListRecord = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  job_work_id: string;
  lot_number: string;
  party_id: string;
  party_name: string;
  amount: number;
  allocated: number;
  outstanding: number;
  status: InvoiceStatus;
};

export type InvoiceOutstanding = {
  allocated: number;
  outstanding: number;
  status: InvoiceStatus;
};

export type InvoiceAllocationRow = {
  id: string;
  entry_id: string;
  entry_date: string;
  entry_amount: number;
  allocated_amount: number;
  remarks: string | null;
  created_at: string;
};

/** One job linked to an invoice via invoice_jobs. */
export type InvoiceJobRow = {
  id: string;
  lot_number: string;
  kapan_number: string;
  weight: number;
  than: number;
  price: number;
  billing_amount: number | null;
  job_type: JobType;
  created_at: string;
};

export type InvoiceDetail = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  status: InvoiceStatus;
  // Primary job kept for backward-compat (detail view, allocations, etc.)
  job_work_id: string;
  lot_number: string;
  kapan_number: string;
  weight: number;
  than: number;
  price: number;
  job_type: JobType;
  party_id: string;
  party_name: string;
  allocated: number;
  outstanding: number;
  allocations: InvoiceAllocationRow[];
  /** ALL jobs on this invoice, sourced from invoice_jobs. Used by print view. */
  jobs: InvoiceJobRow[];
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function emptyPage(input: ListInvoicesInput): Paginated<InvoiceListRecord> {
  return paginated([], 0, input.page, input.pageSize);
}

function toStatus(value: InvoiceStatus | string | null | undefined): InvoiceStatus {
  if (value === "Paid" || value === "Partially Paid" || value === "Unpaid") {
    return value;
  }
  return "Unpaid";
}

async function invoiceIdsForSearch(search: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const pattern = `%${escapeIlike(search)}%`;

  const [{ data: numbers, error: numberError }, { data: lots, error: lotError }] = await Promise.all([
    supabase.from("v_invoice_outstanding").select("invoice_id").ilike("invoice_number", pattern),
    supabase.from("job_works").select("id").ilike("lot_number", pattern),
  ]);

  if (numberError || lotError) {
    throw new AppError("INTERNAL", "Unable to load invoices.");
  }

  const lotJobIds = uniqueIds((lots ?? []).map((row) => row.id));
  let lotInvoiceIds: string[] = [];
  if (lotJobIds.length > 0) {
    const { data: byLot, error: byLotError } = await supabase
      .from("invoices")
      .select("id")
      .in("job_work_id", lotJobIds);
    if (byLotError) {
      throw new AppError("INTERNAL", "Unable to load invoices.");
    }
    lotInvoiceIds = uniqueIds((byLot ?? []).map((row) => row.id));
  }

  return uniqueIds([
    ...(numbers ?? []).map((row) => row.invoice_id),
    ...lotInvoiceIds,
  ]);
}

async function jobIdsForParty(partyId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("job_works").select("id").eq("party_id", partyId);
  if (error) {
    throw new AppError("INTERNAL", "Unable to load invoices.");
  }
  return uniqueIds((data ?? []).map((row) => row.id));
}

async function loadInvoices(
  input: ListInvoicesInput,
  from: number,
  to: number,
): Promise<Paginated<InvoiceListRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  let allowedIds: string[] | null = null;

  if (input.search.trim() !== "") {
    allowedIds = await invoiceIdsForSearch(input.search.trim());
    if (allowedIds.length === 0) {
      return emptyPage(input);
    }
  }

  let query = supabase
    .from("v_invoice_outstanding")
    .select(OUTSTANDING_COLUMNS, { count: "exact" })
    .order("invoice_date", { ascending: false })
    .order("invoice_number", { ascending: false })
    .range(from, to);

  if (allowedIds) {
    query = query.in("invoice_id", allowedIds);
  }

  if (input.status !== "all") {
    query = query.eq("derived_status", input.status);
  }

  if (input.date_from) {
    query = query.gte("invoice_date", input.date_from);
  }

  if (input.date_to) {
    query = query.lte("invoice_date", input.date_to);
  }

  if (input.party_id) {
    const jobIds = await jobIdsForParty(input.party_id);
    if (jobIds.length === 0) {
      return emptyPage(input);
    }
    query = query.in("job_work_id", jobIds);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load invoices.");
  }

  const rows = (data ?? []).filter((row) => row.invoice_id && row.job_work_id);
  const jobIds = uniqueIds(rows.map((row) => row.job_work_id));
  const jobs = new Map<string, { lot_number: string; party_id: string }>();
  const partyNames = new Map<string, string>();

  if (jobIds.length > 0) {
    const { data: jobRows, error: jobError } = await supabase
      .from("job_works")
      .select("id, lot_number, party_id")
      .in("id", jobIds);
    if (jobError) {
      throw new AppError("INTERNAL", "Unable to load invoices.");
    }
    for (const job of jobRows ?? []) {
      jobs.set(job.id, { lot_number: job.lot_number, party_id: job.party_id });
    }
    const partyIds = uniqueIds((jobRows ?? []).map((row) => row.party_id));
    if (partyIds.length > 0) {
      const { data: parties, error: partyError } = await supabase
        .from("parties")
        .select("id, company_name")
        .in("id", partyIds);
      if (partyError) {
        throw new AppError("INTERNAL", "Unable to load invoices.");
      }
      for (const party of parties ?? []) {
        partyNames.set(party.id, party.company_name);
      }
    }
  }

  return paginated(
    rows.map((row) => {
      const job = jobs.get(row.job_work_id ?? "");
      return {
        id: row.invoice_id as string,
        invoice_number: row.invoice_number ?? "",
        invoice_date: row.invoice_date ?? "",
        job_work_id: row.job_work_id as string,
        lot_number: job?.lot_number ?? "—",
        party_id: job?.party_id ?? "",
        party_name: job ? (partyNames.get(job.party_id) ?? "—") : "—",
        amount: asMoneyNumber(row.amount),
        allocated: asMoneyNumber(row.allocated),
        outstanding: asMoneyNumber(row.outstanding),
        status: toStatus(row.derived_status ?? row.stored_status),
      };
    }),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function listInvoices(input: ListInvoicesInput): Promise<Paginated<InvoiceListRecord>> {
  const offset = paginationOffset(input.page, input.pageSize);
  return loadInvoices(input, offset, offset + input.pageSize - 1);
}

export async function exportInvoicesXlsx(input: ListInvoicesInput): Promise<{ buffer: Buffer; count: number }> {
  const result = await loadInvoices(input, 0, EXPORT_REPORT_MAX_ROWS - 1);
  if (result.totalCount > EXPORT_REPORT_MAX_ROWS) {
    throw new AppError(
      "VALIDATION",
      "Too many invoices to export. Narrow the filters and try again.",
    );
  }

  const columns: XlsxColumn[] = [
    { header: "Party", key: "party", width: 30 },
    { header: "Invoice Number", key: "invoiceNumber", width: 20 },
    { header: "Lot Number", key: "lotNumber", width: 18 },
    { header: "Invoice Amount", key: "amount", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Allocated", key: "allocated", width: 15, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Outstanding", key: "outstanding", width: 15, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Status", key: "status", width: 15 },
    { header: "Date", key: "date", width: 12 },
  ];
  const rows = result.records.map((row) => ({
    party: row.party_name,
    invoiceNumber: row.invoice_number,
    lotNumber: row.lot_number,
    amount: row.amount,
    allocated: row.allocated,
    outstanding: row.outstanding,
    status: row.status,
    date: row.invoice_date,
  }));
  const buffer = await generateXlsx([{ name: "Outstanding Invoices", columns, rows: rows.map((r) => Object.values(r)) }]);

  return { buffer, count: result.records.length };
}

export async function getInvoiceOutstanding(id: string): Promise<InvoiceOutstanding> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_invoice_outstanding")
    .select(OUTSTANDING_COLUMNS)
    .eq("invoice_id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load invoice outstanding.");
  }

  if (!data?.invoice_id) {
    throw new AppError("NOT_FOUND", "Invoice was not found.");
  }

  return {
    allocated: asMoneyNumber(data.allocated),
    outstanding: asMoneyNumber(data.outstanding),
    status: toStatus(data.derived_status ?? data.stored_status),
  };
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  // ── Step 1: fetch ONLY the explicitly selected jobs ──────────────────────
  // This is the sole source of billing data. No other jobs are touched.
  const { data: selectedJobs, error: jobsError } = await supabase
    .from("job_works")
    .select("id, party_id, than, price, billing_amount, lot_number")
    .in("id", input.job_ids)
    .eq("party_id", input.party_id);

  if (jobsError) {
    throw new AppError("INTERNAL", "Unable to load selected jobs.");
  }

  if (!selectedJobs || selectedJobs.length === 0) {
    throw new AppError("NOT_FOUND", "No matching jobs found for this party.");
  }

  if (selectedJobs.length !== input.job_ids.length) {
    throw new AppError(
      "VALIDATION",
      "One or more selected jobs do not belong to this party.",
    );
  }

  // ── Step 2: verify none of the selected jobs already has an invoice ───────
  // Check invoices.job_work_id (always authoritative) + invoice_jobs (multi-job links)
  const [{ data: existingInvoices, error: eiError }, { data: existingLinks, error: elError }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("job_work_id")
        .in("job_work_id", input.job_ids),
      supabase
        .from("invoice_jobs")
        .select("job_work_id")
        .in("job_work_id", input.job_ids),
    ]);

  if (eiError || elError) {
    throw new AppError("INTERNAL", "Unable to verify job invoice status.");
  }

  const alreadyInvoiced = new Set([
    ...(existingInvoices ?? []).map((r) => r.job_work_id),
    ...(existingLinks ?? []).map((r) => r.job_work_id),
  ]);

  if (alreadyInvoiced.size > 0) {
    throw new AppError(
      "INTEGRITY",
      "One or more selected jobs already have an invoice.",
    );
  }

  // ── Step 4: create the invoice row ────────────────────────────────────────
  const { data: rpcData, error: rpcError } = await supabase.rpc("create_invoice_for_jobs", {
    p_party_id: input.party_id,
    p_job_ids: input.job_ids,
    p_invoice_date: input.invoice_date,
  });

  if (rpcError) {
    throw rpcError;
  }

  const row = (rpcData ?? [])[0] as { invoice_id?: string } | undefined;
  if (!row?.invoice_id) {
    throw new AppError("INTERNAL", "Unable to create invoice.");
  }

  return getInvoice(row.invoice_id);
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, amount, status, job_work_id")
    .eq("id", id)
    .maybeSingle();

  if (invoiceError) {
    throw new AppError("INTERNAL", "Unable to load invoice.");
  }

  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice was not found.");
  }

  // ── Load all jobs linked to this invoice via invoice_jobs ────────────────
  // This is the authoritative source for multi-job invoices.
  // We fall back to invoices.job_work_id only if invoice_jobs has no rows
  // (pre-migration_06 data gap).
  const { data: invoiceJobLinks, error: ijError } = await supabase
    .from("invoice_jobs")
    .select("job_work_id")
    .eq("invoice_id", id);

  if (ijError) {
    throw new AppError("INTERNAL", "Unable to load invoice jobs.");
  }

  // Collect all job IDs: prefer invoice_jobs, fall back to primary job_work_id.
  const linkedJobIds = invoiceJobLinks && invoiceJobLinks.length > 0
    ? uniqueIds(invoiceJobLinks.map((r) => r.job_work_id))
    : [invoice.job_work_id];

  const [
    { data: jobRows, error: jobsError },
    outstanding,
    { data: allocationRows, error: allocationError },
  ] = await Promise.all([
    supabase.from("job_works").select(JOB_COLUMNS).in("id", linkedJobIds),
    getInvoiceOutstanding(id),
    supabase
      .from("entry_invoice_allocations")
      .select(ALLOCATION_COLUMNS)
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (jobsError || !jobRows || jobRows.length === 0) {
    throw new AppError("INTERNAL", "Unable to load invoice.");
  }

  if (allocationError) {
    throw new AppError("INTERNAL", "Unable to load invoice allocations.");
  }

  // Primary job — used for backward-compat fields on InvoiceDetail.
  // After the guard above jobRows is non-empty, so jobRows[0] is always defined.
  const primaryJob = jobRows.find((j) => j.id === invoice.job_work_id) ?? jobRows[0]!;

  const { data: party } = await supabase
    .from("parties")
    .select("company_name")
    .eq("id", primaryJob.party_id)
    .maybeSingle();

  const entryIds = uniqueIds((allocationRows ?? []).map((row) => row.entry_id));
  const entries = new Map<string, { entry_date: string; amount: number; remarks: string | null }>();
  if (entryIds.length > 0) {
    const { data: entryRows, error: entryError } = await supabase
      .from("entries")
      .select(ENTRY_COLUMNS)
      .in("id", entryIds);
    if (entryError) {
      throw new AppError("INTERNAL", "Unable to load invoice allocations.");
    }
    for (const entry of entryRows ?? []) {
      entries.set(entry.id, {
        entry_date: entry.entry_date,
        amount: asMoneyNumber(entry.amount),
        remarks: entry.remarks,
      });
    }
  }

  // Preserve the original insertion order: primary job first, then the rest
  // in the order they appear in invoice_jobs.
  const orderedJobs = [
    primaryJob,
    ...jobRows.filter((j) => j.id !== primaryJob.id),
  ];

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    amount: asMoneyNumber(invoice.amount),
    status: outstanding.status,
    job_work_id: invoice.job_work_id,
    lot_number: primaryJob.lot_number,
    kapan_number: primaryJob.kapan_number,
    weight: asMoneyNumber(primaryJob.weight),
    than: asMoneyNumber(primaryJob.than),
    price: asMoneyNumber(primaryJob.price),
    job_type: primaryJob.job_type,
    party_id: primaryJob.party_id,
    party_name: party?.company_name ?? "—",
    allocated: outstanding.allocated,
    outstanding: outstanding.outstanding,
    allocations: (allocationRows ?? []).map((row) => {
      const entry = entries.get(row.entry_id);
      return {
        id: row.id,
        entry_id: row.entry_id,
        entry_date: entry?.entry_date ?? "",
        entry_amount: entry?.amount ?? 0,
        allocated_amount: asMoneyNumber(row.amount),
        remarks: entry?.remarks ?? null,
        created_at: row.created_at,
      };
    }),
    jobs: orderedJobs.map((job) => ({
      id: job.id,
      lot_number: job.lot_number,
      kapan_number: job.kapan_number,
      weight: asMoneyNumber(job.weight),
      than: asMoneyNumber(job.than),
      price: asMoneyNumber(job.price),
      billing_amount: job.billing_amount != null ? asMoneyNumber(job.billing_amount) : null,
      job_type: job.job_type,
      created_at: job.created_at,
    })),
  };
}
