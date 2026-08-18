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
  "status",
  "than",
  "price",
  "kapan_number",
  "weight",
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
  "job_work_id",
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
  status: string;
  than: number;
  price: number;
  kapan_number: string;
  weight: number;
  created_at: string;
};

export type PartyInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  lot_number: string;
  kapan_number: string;
  weight: number;
  than: number;
  price: number;
  amount: number;
  allocated: number;
  outstanding: number;
  status: string;
  job_work_id: string;
};

export type PartySummary = {
  jobsCount: number;
  invoicesCount: number;
  outstanding: number;
  jobs: PartyJobRow[];
  invoices: PartyInvoiceRow[];
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
    .order("company_name", { ascending: true })
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

  const jobRows: PartyJobRow[] = (jobs ?? []).map((row) => ({
    id: row.id,
    lot_number: row.lot_number,
    status: row.status,
    than: asMoneyNumber(row.than),
    price: asMoneyNumber(row.price),
    kapan_number: row.kapan_number,
    weight: asMoneyNumber(row.weight),
    created_at: row.created_at,
  }));

  const jobIds = jobRows.map((row) => row.id);
  const jobById = new Map(jobRows.map((row) => [row.id, row]));
  let invoices: PartyInvoiceRow[] = [];

  if (jobIds.length > 0) {
    const { data: invoiceRows, error: invoiceError } = await supabase
      .from("v_invoice_outstanding")
      .select(INVOICE_SUMMARY_COLUMNS)
      .in("job_work_id", jobIds)
      .order("invoice_date", { ascending: true })
      .order("invoice_number", { ascending: true });

    if (invoiceError) {
      throw new AppError("INTERNAL", "Unable to load party invoices.");
    }

    invoices = (invoiceRows ?? [])
      .filter((row) => row.invoice_id && row.job_work_id)
      .map((row) => {
        const job = jobById.get(row.job_work_id ?? "");
        return {
          id: row.invoice_id as string,
          invoice_number: row.invoice_number ?? "",
          invoice_date: row.invoice_date ?? "",
          lot_number: job?.lot_number ?? "—",
          kapan_number: job?.kapan_number ?? "",
          weight: job?.weight ?? 0,
          than: job?.than ?? 0,
          price: job?.price ?? 0,
          amount: asMoneyNumber(row.amount),
          allocated: asMoneyNumber(row.allocated),
          outstanding: asMoneyNumber(row.outstanding),
          status: row.derived_status ?? "Unpaid",
          job_work_id: row.job_work_id as string,
        };
      });
  }

  const { data: outstandingRow, error: outstandingError } = await supabase
    .from("v_party_outstanding")
    .select("outstanding_sum")
    .eq("party_id", id)
    .maybeSingle();

  if (outstandingError) {
    throw new AppError("INTERNAL", "Unable to load party outstanding.");
  }

  return {
    jobsCount: jobRows.length,
    invoicesCount: invoices.length,
    outstanding: asMoneyNumber(outstandingRow?.outstanding_sum),
    jobs: jobRows,
    invoices,
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
