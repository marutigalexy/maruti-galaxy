import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber, moneyEquals } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { toCsv } from "@/lib/api/csv";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EXPORT_ENTRIES_MAX_ROWS,
  type CreateEmployeePaymentInput,
  type CreateEntryInput,
  type ListEntriesInput,
  type UpdateEntryInput,
} from "@/lib/validation/entries";
import { getEmployee } from "@/services/employees/employees-service";
import type { Database } from "@/types/database";

type EntryType = Database["public"]["Enums"]["entry_type"];

const ENTRY_COLUMNS = selectColumns([
  "id",
  "party_id",
  "employee_id",
  "account_id",
  "category_id",
  "entry_type",
  "entry_date",
  "amount",
  "remarks",
  "created_at",
]);

const ALLOCATION_COLUMNS = selectColumns(["id", "entry_id", "invoice_id", "amount", "created_at"]);

export type EntrySummary = {
  total_income: number;
  total_expense: number;
  net: number;
  count: number;
};

export type EntryListRecord = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  account_id: string;
  account_name: string;
  category_id: string;
  category_name: string;
  party_id: string | null;
  party_name: string | null;
  employee_id: string | null;
  employee_name: string | null;
  amount: number;
  remarks: string | null;
  allocated: number;
  remaining: number;
};

export type EntryAllocationRow = {
  id: string;
  invoice_id: string;
  invoice_number: string;
  allocated_amount: number;
  created_at: string;
};

export type EntryDetail = EntryListRecord & {
  allocations: EntryAllocationRow[];
};

export type ListedEntries = Paginated<EntryListRecord> & {
  summary: EntrySummary;
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

type FilterableQuery = {
  eq: (column: string, value: string) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
  ilike: (column: string, value: string) => FilterableQuery;
};

function applyEntryFilters<T extends FilterableQuery>(query: T, input: ListEntriesInput): T {
  let next: FilterableQuery = query;
  if (input.search.trim() !== "") {
    next = next.ilike("remarks", `%${escapeIlike(input.search.trim())}%`);
  }
  if (input.entry_type !== "all") {
    next = next.eq("entry_type", input.entry_type);
  }
  if (input.account_id) {
    next = next.eq("account_id", input.account_id);
  }
  if (input.category_id) {
    next = next.eq("category_id", input.category_id);
  }
  if (input.party_id) {
    next = next.eq("party_id", input.party_id);
  }
  if (input.employee_id) {
    next = next.eq("employee_id", input.employee_id);
  }
  if (input.date_from) {
    next = next.gte("entry_date", input.date_from);
  }
  if (input.date_to) {
    next = next.lte("entry_date", input.date_to);
  }
  return next as T;
}

async function allocatedByEntryIds(ids: string[]): Promise<Map<string, number>> {
  const sums = new Map(ids.map((id) => [id, 0]));
  if (ids.length === 0) {
    return sums;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entry_invoice_allocations")
    .select("entry_id, amount")
    .in("entry_id", ids);

  if (error) {
    throw new AppError("INTERNAL", "Unable to load allocations.");
  }

  for (const row of data ?? []) {
    sums.set(row.entry_id, (sums.get(row.entry_id) ?? 0) + asMoneyNumber(row.amount));
  }

  return sums;
}

async function namesFor(rows: Array<{
  account_id: string;
  category_id: string;
  party_id: string | null;
  employee_id: string | null;
}>): Promise<{
  accounts: Map<string, string>;
  categories: Map<string, string>;
  parties: Map<string, string>;
  employees: Map<string, string>;
}> {
  const supabase = await createSupabaseServerClient();
  const accountIds = uniqueIds(rows.map((row) => row.account_id));
  const categoryIds = uniqueIds(rows.map((row) => row.category_id));
  const partyIds = uniqueIds(rows.map((row) => row.party_id));
  const employeeIds = uniqueIds(rows.map((row) => row.employee_id));

  const [accounts, categories, parties, employees] = await Promise.all([
    accountIds.length
      ? supabase.from("accounts").select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    partyIds.length
      ? supabase.from("parties").select("id, company_name").in("id", partyIds)
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length
      ? supabase.from("employees").select("id, name").in("id", employeeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (accounts.error || categories.error || parties.error || employees.error) {
    throw new AppError("INTERNAL", "Unable to load entries.");
  }

  return {
    accounts: new Map((accounts.data ?? []).map((row) => [row.id, row.name])),
    categories: new Map((categories.data ?? []).map((row) => [row.id, row.name])),
    parties: new Map((parties.data ?? []).map((row) => [row.id, row.company_name])),
    employees: new Map((employees.data ?? []).map((row) => [row.id, row.name])),
  };
}

async function toListRecords(
  rows: Array<{
    id: string;
    entry_date: string;
    entry_type: EntryType;
    account_id: string;
    category_id: string;
    party_id: string | null;
    employee_id: string | null;
    amount: number;
    remarks: string | null;
  }>,
): Promise<EntryListRecord[]> {
  const [names, allocated] = await Promise.all([
    namesFor(rows),
    allocatedByEntryIds(rows.map((row) => row.id)),
  ]);

  return rows.map((row) => {
    const amount = asMoneyNumber(row.amount);
    const allocatedAmount = allocated.get(row.id) ?? 0;
    return {
      id: row.id,
      entry_date: row.entry_date,
      entry_type: row.entry_type,
      account_id: row.account_id,
      account_name: names.accounts.get(row.account_id) ?? "—",
      category_id: row.category_id,
      category_name: names.categories.get(row.category_id) ?? "—",
      party_id: row.party_id,
      party_name: row.party_id ? (names.parties.get(row.party_id) ?? "—") : null,
      employee_id: row.employee_id,
      employee_name: row.employee_id ? (names.employees.get(row.employee_id) ?? "—") : null,
      amount,
      remarks: row.remarks,
      allocated: allocatedAmount,
      remaining: Math.max(0, Math.round((amount - allocatedAmount) * 100) / 100),
    };
  });
}

async function sumByType(input: ListEntriesInput, entryType: EntryType): Promise<number> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("entries").select("amount").eq("entry_type", entryType);
  query = applyEntryFilters(query, { ...input, entry_type: "all" });
  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load entry summary.");
  }
  return (data ?? []).reduce((total, row) => total + asMoneyNumber(row.amount), 0);
}

export async function listEntries(input: ListEntriesInput): Promise<ListedEntries> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);

  let query = supabase
    .from("entries")
    .select(ENTRY_COLUMNS, { count: "exact" })
    .range(offset, offset + input.pageSize - 1);

  const sortColumn =
    input.sort === "type" ? "entry_type" : input.sort === "amount" ? "amount" : "entry_date";
  query = query.order(sortColumn, { ascending: input.dir === "asc" });
  query = query.order("created_at", { ascending: false });

  query = applyEntryFilters(query, input);

  const [{ data, error, count }, totalIncome, totalExpense] = await Promise.all([
    query,
    input.entry_type === "Expense" ? Promise.resolve(0) : sumByType(input, "Income"),
    input.entry_type === "Income" ? Promise.resolve(0) : sumByType(input, "Expense"),
  ]);

  if (error) {
    throw new AppError("INTERNAL", "Unable to load entries.");
  }

  const records = await toListRecords(data ?? []);
  const totalCount = count ?? 0;
  const net = Math.round((totalIncome - totalExpense) * 100) / 100;

  return {
    ...paginated(records, totalCount, input.page, input.pageSize),
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      net,
      count: totalCount,
    },
  };
}

export async function getEntry(id: string): Promise<EntryDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load entry.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Entry was not found.");
  }

  const records = await toListRecords([data]);
  const record = records[0];
  if (!record) {
    throw new AppError("INTERNAL", "Unable to load entry.");
  }
  const { data: allocationRows, error: allocationError } = await supabase
    .from("entry_invoice_allocations")
    .select(ALLOCATION_COLUMNS)
    .eq("entry_id", id)
    .order("created_at", { ascending: true });

  if (allocationError) {
    throw new AppError("INTERNAL", "Unable to load allocations.");
  }

  const invoiceIds = uniqueIds((allocationRows ?? []).map((row) => row.invoice_id));
  const invoiceNumbers = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .in("id", invoiceIds);
    if (invoiceError) {
      throw new AppError("INTERNAL", "Unable to load allocations.");
    }
    for (const invoice of invoices ?? []) {
      invoiceNumbers.set(invoice.id, invoice.invoice_number);
    }
  }

  return {
    ...record,
    allocations: (allocationRows ?? []).map((row) => ({
      id: row.id,
      invoice_id: row.invoice_id,
      invoice_number: invoiceNumbers.get(row.invoice_id) ?? "—",
      allocated_amount: asMoneyNumber(row.amount),
      created_at: row.created_at,
    })),
  };
}

export async function createEntry(input: CreateEntryInput): Promise<EntryDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .insert({
      entry_type: input.entry_type,
      account_id: input.account_id,
      category_id: input.category_id,
      party_id: input.party_id,
      employee_id: input.employee_id,
      entry_date: input.entry_date,
      amount: asMoneyNumber(input.amount),
      remarks: input.remarks,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError("INTERNAL", "Unable to create entry.");
  }

  return getEntry(data.id);
}

export async function createEmployeePayment(input: CreateEmployeePaymentInput): Promise<EntryDetail> {
  await requireActiveAdmin();
  await getEmployee(input.employee_id);
  return createEntry({
    entry_type: "Expense",
    account_id: input.account_id,
    category_id: input.category_id,
    party_id: null,
    employee_id: input.employee_id,
    entry_date: input.entry_date,
    amount: input.amount,
    remarks: input.remarks,
  });
}

export async function updateEntry(input: UpdateEntryInput): Promise<EntryDetail> {
  await requireActiveAdmin();
  const existing = await getEntry(input.id);
  const nextAmount = asMoneyNumber(input.amount);
  const hasAllocations = existing.allocated > 0;

  if (hasAllocations && (!moneyEquals(existing.amount, nextAmount) || existing.entry_type !== input.entry_type)) {
    throw new AppError(
      "INTEGRITY",
      "Remove invoice allocations before changing this entry amount or type.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .update({
      entry_type: input.entry_type,
      account_id: input.account_id,
      category_id: input.category_id,
      party_id: input.party_id,
      employee_id: input.employee_id,
      entry_date: input.entry_date,
      amount: nextAmount,
      remarks: input.remarks,
    })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Entry was not found.");
  }

  return getEntry(data.id);
}

export async function deleteEntry(id: string): Promise<{ ok: true }> {
  await requireActiveAdmin();
  const existing = await getEntry(id);
  if (existing.allocated > 0) {
    throw new AppError("INTEGRITY", "Remove invoice allocations before deleting this entry.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("entries").delete().eq("id", id).select("id").maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Entry was not found.");
  }

  return { ok: true };
}

export async function exportEntriesCsv(input: ListEntriesInput): Promise<{ csv: string; count: number }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("entries")
    .select(ENTRY_COLUMNS, { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, EXPORT_ENTRIES_MAX_ROWS - 1);

  query = applyEntryFilters(query, input);

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to export entries.");
  }

  if ((count ?? 0) > EXPORT_ENTRIES_MAX_ROWS) {
    throw new AppError(
      "VALIDATION",
      "Too many entries to export. Narrow the filters and try again.",
    );
  }

  const records = await toListRecords(data ?? []);
  const csv = toCsv(
    ["Date", "Type", "Account", "Category", "Party", "Employee", "Amount", "Remarks"],
    records.map((row) => [
      row.entry_date,
      row.entry_type,
      row.account_name,
      row.category_name,
      row.party_name,
      row.employee_name,
      row.amount.toFixed(2),
      row.remarks,
    ]),
  );

  return { csv: `\uFEFF${csv}`, count: records.length };
}
