import { asMoneyNumber } from "@/lib/api/numbers";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AllocateEntryInput, AllocateInvoiceInput } from "@/lib/validation/entries";
import { getEntry, type EntryDetail } from "@/services/entries/entries-service";
import { getInvoice, type InvoiceDetail } from "@/services/invoices/invoices-service";

const OUTSTANDING_COLUMNS = selectColumns([
  "invoice_id",
  "invoice_number",
  "job_work_id",
  "invoice_date",
  "amount",
  "outstanding",
  "derived_status",
]);

export type OutstandingInvoiceOption = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  lot_number: string;
  party_name: string;
  amount: number;
  outstanding: number;
};

export type AllocatableIncomeEntry = {
  id: string;
  entry_date: string;
  remarks: string | null;
  amount: number;
  remaining: number;
  party_name: string | null;
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export async function listOutstandingInvoices(): Promise<OutstandingInvoiceOption[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_invoice_outstanding")
    .select(OUTSTANDING_COLUMNS)
    .gt("outstanding", 0)
    .order("invoice_date", { ascending: false })
    .limit(100);

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

  return rows.map((row) => {
    const job = jobs.get(row.job_work_id ?? "");
    return {
      id: row.invoice_id as string,
      invoice_number: row.invoice_number ?? "",
      invoice_date: row.invoice_date ?? "",
      lot_number: job?.lot_number ?? "—",
      party_name: job ? (partyNames.get(job.party_id) ?? "—") : "—",
      amount: asMoneyNumber(row.amount),
      outstanding: asMoneyNumber(row.outstanding),
    };
  });
}

export async function listAllocatableIncomeEntries(): Promise<AllocatableIncomeEntry[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id, entry_date, amount, remarks, party_id")
    .eq("entry_type", "Income")
    .order("entry_date", { ascending: false })
    .limit(200);

  if (error) {
    throw new AppError("INTERNAL", "Unable to load entries.");
  }

  const rows = data ?? [];
  const entryIds = rows.map((row) => row.id);
  const allocated = new Map<string, number>();
  if (entryIds.length > 0) {
    const { data: allocationRows, error: allocationError } = await supabase
      .from("entry_invoice_allocations")
      .select("entry_id, amount")
      .in("entry_id", entryIds);
    if (allocationError) {
      throw new AppError("INTERNAL", "Unable to load allocations.");
    }
    for (const row of allocationRows ?? []) {
      allocated.set(row.entry_id, (allocated.get(row.entry_id) ?? 0) + asMoneyNumber(row.amount));
    }
  }

  const partyIds = uniqueIds(rows.map((row) => row.party_id));
  const partyNames = new Map<string, string>();
  if (partyIds.length > 0) {
    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select("id, company_name")
      .in("id", partyIds);
    if (partyError) {
      throw new AppError("INTERNAL", "Unable to load entries.");
    }
    for (const party of parties ?? []) {
      partyNames.set(party.id, party.company_name);
    }
  }

  return rows
    .map((row) => {
      const amount = asMoneyNumber(row.amount);
      const remaining = Math.max(0, Math.round((amount - (allocated.get(row.id) ?? 0)) * 100) / 100);
      return {
        id: row.id,
        entry_date: row.entry_date,
        remarks: row.remarks,
        amount,
        remaining,
        party_name: row.party_id ? (partyNames.get(row.party_id) ?? "—") : null,
      };
    })
    .filter((row) => row.remaining > 0)
    .slice(0, 100);
}

export async function allocateEntryToInvoices(input: AllocateEntryInput): Promise<EntryDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("allocate_entry_to_invoices", {
    p_entry_id: input.entry_id,
    p_items: input.items.map((item) => ({
      invoice_id: item.invoice_id,
      amount: asMoneyNumber(item.amount),
    })),
  });

  if (error) {
    throw error;
  }

  return getEntry(input.entry_id);
}

export async function allocateInvoicesFromEntries(input: AllocateInvoiceInput): Promise<InvoiceDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  for (const item of input.items) {
    const { error } = await supabase.rpc("allocate_entry_to_invoices", {
      p_entry_id: item.entry_id,
      p_items: [{ invoice_id: input.invoice_id, amount: asMoneyNumber(item.amount) }],
    });
    if (error) {
      throw error;
    }
  }

  return getInvoice(input.invoice_id);
}
