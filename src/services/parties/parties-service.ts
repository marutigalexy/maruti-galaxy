import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { isRestrictViolation, mentionsConstraint } from "@/lib/api/postgres";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreatePartyInput,
  ListPartiesInput,
  SetPartyActiveInput,
  UpdatePartyInput,
} from "@/lib/validation/parties";

export const PARTY_LIST_COLUMNS = selectColumns([
  "id",
  "company_name",
  "contact_person_name",
  "mobile_number",
  "price",
  "is_active",
  "created_at",
]);

const JOB_SUMMARY_COLUMNS = selectColumns([
  "id",
  "lot_number",
  "job_type",
  "status",
  "than",
  "price",
  "kapan_number",
  "weight",
  "billing_amount",
  "created_at",
]);
const INVOICE_SUMMARY_COLUMNS = selectColumns([
  "invoice_id",
  "invoice_number",
  "invoice_date",
  "amount",
  "allocated",
  "outstanding",
  "derived_status",
]);

export type PartyRecord = {
  id: string;
  company_name: string;
  contact_person_name: string | null;
  mobile_number: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type PartyJobRow = {
  id: string;
  lot_number: string;
  job_type: string;
  status: string;
  than: number;
  remaining_than: number;
  price: number;
  kapan_number: string;
  weight: number;
  billing_amount: number;
  created_at: string;
};

export type PartyInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  lot_numbers: string[];
  amount: number;
  allocated: number;
  outstanding: number;
  status: string;
  job_work_ids: string[];
};

export type PartyPaymentRow = {
  id: string;
  entry_date: string;
  amount: number;
  remarks: string | null;
  account_name: string | null;
  category_name: string | null;
};

export type PartySummary = {
  jobsCount: number;
  invoicesCount: number;
  outstanding: number;
  jobs: PartyJobRow[];
  invoices: PartyInvoiceRow[];
  payments: PartyPaymentRow[];
};

function toParty(row: {
  id: string;
  company_name: string;
  contact_person_name: string | null;
  mobile_number: string;
  price: number;
  is_active: boolean;
  created_at: string;
}): PartyRecord {
  return {
    id: row.id,
    company_name: row.company_name,
    contact_person_name: row.contact_person_name,
    mobile_number: row.mobile_number,
    price: asMoneyNumber(row.price),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

function throwPartyDeleteError(error: unknown): never {
  if (isRestrictViolation(error)) {
    if (mentionsConstraint(error, "job_works")) {
      throw new AppError(
        "INTEGRITY",
        "This party has jobs and cannot be deleted. Deactivate it instead.",
      );
    }
    if (mentionsConstraint(error, "entries")) {
      throw new AppError(
        "INTEGRITY",
        "This party has accounting entries and cannot be deleted. Deactivate it instead.",
      );
    }
    throw new AppError(
      "INTEGRITY",
      "This party is in use and cannot be deleted. Deactivate it instead.",
    );
  }

  throw new AppError("INTERNAL", "Unable to delete party.");
}

export async function listParties(input: ListPartiesInput): Promise<Paginated<PartyRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  const search = input.search.trim();

  let query = supabase
    .from("parties")
    .select(PARTY_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  if (input.status === "active") {
    query = query.eq("is_active", true);
  }

  if (input.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (search !== "") {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.or(`company_name.ilike.${pattern},mobile_number.ilike.${pattern}`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load parties.");
  }

  return paginated((data ?? []).map(toParty), count ?? 0, input.page, input.pageSize);
}

export async function getParty(id: string): Promise<PartyRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .select(PARTY_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load party.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Party was not found.");
  }

  return toParty(data);
}

export async function getPartySummary(id: string): Promise<PartySummary> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: jobs, error: jobsError } = await supabase
    .from("job_works")
    .select(JOB_SUMMARY_COLUMNS)
    .eq("party_id", id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new AppError("INTERNAL", "Unable to load party jobs.");
  }

  const jobIds = (jobs ?? []).map((row) => row.id);
  const subAllocated = new Map<string, number>();

  if (jobIds.length > 0) {
    const { data: subRows, error: subError } = await supabase
      .from("sub_jobs")
      .select("job_id, than")
      .in("job_id", jobIds);

    if (subError) {
      throw new AppError("INTERNAL", "Unable to load party jobs.");
    }

    for (const sub of subRows ?? []) {
      subAllocated.set(sub.job_id, (subAllocated.get(sub.job_id) ?? 0) + asMoneyNumber(sub.than));
    }
  }

  const jobRows: PartyJobRow[] = (jobs ?? []).map((row) => {
    const than = asMoneyNumber(row.than);
    const billingAmount =
      row.billing_amount != null
        ? asMoneyNumber(row.billing_amount)
        : Math.round(than * asMoneyNumber(row.price) * 100) / 100;
    const used = subAllocated.get(row.id) ?? 0;
    const remainingThan = Math.max(0, Math.round((than - used) * 1000) / 1000);
    return {
      id: row.id,
      lot_number: row.lot_number,
      job_type: row.job_type,
      status: row.status,
      than,
      remaining_than: remainingThan,
      price: asMoneyNumber(row.price),
      kapan_number: row.kapan_number,
      weight: asMoneyNumber(row.weight),
      billing_amount: billingAmount,
      created_at: row.created_at,
    };
  });

  let invoices: PartyInvoiceRow[] = [];

  if (jobIds.length > 0) {
    // Step 1: find all invoices whose primary job belongs to this party.
    // invoices.job_work_id is always set (unique index) — this is the
    // authoritative source and covers every invoice regardless of whether
    // migration_07 has been applied yet.
    const { data: primaryInvoiceRows, error: primaryError } = await supabase
      .from("invoices")
      .select("id, job_work_id")
      .in("job_work_id", jobIds);

    if (primaryError) {
      throw new AppError("INTERNAL", "Unable to load party invoices.");
    }

    const invoiceIds = [...new Set((primaryInvoiceRows ?? []).map((r) => r.id))];

    if (invoiceIds.length > 0) {
      // Step 2: load the full invoice_jobs links so we know ALL jobs on each
      // invoice (multi-job invoices). Fall back to job_work_id for any invoice
      // that has no invoice_jobs row yet (pre-migration gap).
      const { data: invoiceJobLinks, error: ijError } = await supabase
        .from("invoice_jobs")
        .select("invoice_id, job_work_id")
        .in("invoice_id", invoiceIds);

      if (ijError) {
        throw new AppError("INTERNAL", "Unable to load party invoices.");
      }

      // Build map: invoice_id → job_work_ids[]
      // Seed with the primary job so invoices with no invoice_jobs rows are
      // still represented correctly.
      const jobsByInvoice = new Map<string, string[]>();
      for (const row of primaryInvoiceRows ?? []) {
        jobsByInvoice.set(row.id, [row.job_work_id]);
      }
      for (const link of invoiceJobLinks ?? []) {
        const existing = jobsByInvoice.get(link.invoice_id);
        if (existing) {
          // Add only if not already present (avoid duplicating the primary job)
          if (!existing.includes(link.job_work_id)) {
            existing.push(link.job_work_id);
          }
        } else {
          jobsByInvoice.set(link.invoice_id, [link.job_work_id]);
        }
      }

      const { data: invoiceRows, error: invoiceError } = await supabase
        .from("v_invoice_outstanding")
        .select(INVOICE_SUMMARY_COLUMNS)
        .in("invoice_id", invoiceIds)
        .order("invoice_date", { ascending: true })
        .order("invoice_number", { ascending: true });

      if (invoiceError) {
        throw new AppError("INTERNAL", "Unable to load party invoices.");
      }

      const jobById = new Map(jobRows.map((row) => [row.id, row]));

      invoices = (invoiceRows ?? [])
        .filter((row) => row.invoice_id)
        .map((row) => {
          const linkedJobIds = jobsByInvoice.get(row.invoice_id as string) ?? [];
          const lotNumbers = linkedJobIds
            .map((jid) => jobById.get(jid)?.lot_number)
            .filter((ln): ln is string => Boolean(ln));
          return {
            id: row.invoice_id as string,
            invoice_number: row.invoice_number ?? "",
            invoice_date: row.invoice_date ?? "",
            lot_numbers: lotNumbers,
            amount: asMoneyNumber(row.amount),
            allocated: asMoneyNumber(row.allocated),
            outstanding: asMoneyNumber(row.outstanding),
            status: row.derived_status ?? "Unpaid",
            job_work_ids: linkedJobIds,
          };
        });
    }
  }

  const [{ data: outstandingRow, error: outstandingError }, { data: paymentRows, error: paymentError }] =
    await Promise.all([
      supabase
        .from("v_party_outstanding")
        .select("outstanding_sum")
        .eq("party_id", id)
        .maybeSingle(),
      supabase
        .from("entries")
        .select("id, entry_date, amount, remarks, account_id, category_id")
        .eq("entry_type", "Income")
        .eq("party_id", id)
        .order("entry_date", { ascending: false }),
    ]);

  if (outstandingError) {
    throw new AppError("INTERNAL", "Unable to load party outstanding.");
  }

  if (paymentError) {
    throw new AppError("INTERNAL", "Unable to load party payments.");
  }

  const accountIds = [...new Set((paymentRows ?? []).map((r) => r.account_id).filter(Boolean))];
  const categoryIds = [...new Set((paymentRows ?? []).map((r) => r.category_id).filter(Boolean))];

  const [{ data: accountsData }, { data: categoriesData }] = await Promise.all([
    accountIds.length > 0
      ? supabase.from("accounts").select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const accountNames = new Map((accountsData ?? []).map((a) => [a.id, a.name]));
  const categoryNames = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));

  const payments: PartyPaymentRow[] = (paymentRows ?? []).map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    amount: asMoneyNumber(row.amount),
    remarks: row.remarks,
    account_name: row.account_id ? accountNames.get(row.account_id) ?? null : null,
    category_name: row.category_id ? categoryNames.get(row.category_id) ?? null : null,
  }));

  return {
    jobsCount: jobRows.length,
    invoicesCount: invoices.length,
    outstanding: asMoneyNumber(outstandingRow?.outstanding_sum),
    jobs: jobRows,
    invoices,
    payments,
  };
}

export async function createParty(input: CreatePartyInput): Promise<PartyRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .insert({
      company_name: input.company_name,
      contact_person_name: input.contact_person_name,
      mobile_number: input.mobile_number,
      price: asMoneyNumber(input.price),
      is_active: input.is_active,
    })
    .select(PARTY_LIST_COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Unable to create party.");
  }

  return toParty(data);
}

export async function updateParty(input: UpdatePartyInput): Promise<PartyRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .update({
      company_name: input.company_name,
      contact_person_name: input.contact_person_name,
      mobile_number: input.mobile_number,
      price: asMoneyNumber(input.price),
    })
    .eq("id", input.id)
    .select(PARTY_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update party.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Party was not found.");
  }

  return toParty(data);
}

export async function setPartyActive(input: SetPartyActiveInput): Promise<PartyRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select(PARTY_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update party.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Party was not found.");
  }

  return toParty(data);
}

export type PartyOption = {
  id: string;
  company_name: string;
  price: number;
  is_active: boolean;
};

export async function listPartyOptions(): Promise<PartyOption[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .select("id, company_name, price, is_active")
    .order("company_name", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL", "Unable to load parties.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    company_name: row.company_name,
    price: asMoneyNumber(row.price),
    is_active: row.is_active,
  }));
}

export async function deleteParty(id: string): Promise<{ ok: true }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parties")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throwPartyDeleteError(error);
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Party was not found.");
  }

  return { ok: true };
}
