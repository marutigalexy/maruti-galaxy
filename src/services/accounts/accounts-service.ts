import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber, moneyEquals } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { isRestrictViolation, isUniqueViolation } from "@/lib/api/postgres";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateAccountInput,
  ListAccountsInput,
  SetAccountActiveInput,
  UpdateAccountInput,
} from "@/lib/validation/accounts";

export const ACCOUNT_BALANCE_COLUMNS = selectColumns([
  "account_id",
  "name",
  "opening_balance",
  "total_in",
  "total_out",
  "current_balance",
  "entry_count",
  "is_active",
]);

const ENTRY_STUB_COLUMNS = selectColumns(["id", "entry_date", "entry_type", "amount", "remarks"]);

export type AccountRecord = {
  id: string;
  name: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  current_balance: number;
  entry_count: number;
  is_active: boolean;
};

export type AccountEntryRow = {
  id: string;
  entry_date: string;
  entry_type: string;
  amount: number;
  remarks: string | null;
};

function toAccount(row: {
  account_id: string | null;
  name: string | null;
  opening_balance: number | null;
  total_in: number | null;
  total_out: number | null;
  current_balance: number | null;
  entry_count: number | null;
  is_active: boolean | null;
}): AccountRecord | null {
  if (!row.account_id || row.name === null || row.is_active === null) {
    return null;
  }

  return {
    id: row.account_id,
    name: row.name,
    opening_balance: asMoneyNumber(row.opening_balance),
    total_in: asMoneyNumber(row.total_in),
    total_out: asMoneyNumber(row.total_out),
    current_balance: asMoneyNumber(row.current_balance),
    entry_count: asMoneyNumber(row.entry_count),
    is_active: row.is_active,
  };
}

function throwAccountWriteError(error: unknown, fallback: string): never {
  if (isUniqueViolation(error)) {
    throw new AppError("CONFLICT", "An account with this name already exists.");
  }
  if (isRestrictViolation(error)) {
    throw new AppError("INTEGRITY", "This account has entries and cannot be deleted.");
  }
  throw new AppError("INTERNAL", fallback);
}

async function getAccountRow(id: string): Promise<AccountRecord> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_account_balances")
    .select(ACCOUNT_BALANCE_COLUMNS)
    .eq("account_id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load account.");
  }

  const account = data ? toAccount(data) : null;
  if (!account) {
    throw new AppError("NOT_FOUND", "Account was not found.");
  }

  return account;
}

export async function listAccounts(input: ListAccountsInput): Promise<Paginated<AccountRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  const search = input.search.trim();

  let query = supabase
    .from("v_account_balances")
    .select(ACCOUNT_BALANCE_COLUMNS, { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + input.pageSize - 1);

  if (input.status === "active") {
    query = query.eq("is_active", true);
  }

  if (input.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (search !== "") {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.ilike("name", pattern);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load accounts.");
  }

  return paginated(
    (data ?? []).map(toAccount).filter((row): row is AccountRecord => row !== null),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getAccount(id: string): Promise<AccountRecord> {
  await requireActiveAdmin();
  return getAccountRow(id);
}

export async function listAccountEntries(id: string): Promise<AccountEntryRow[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_STUB_COLUMNS)
    .eq("account_id", id)
    .order("entry_date", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", "Unable to load account entries.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    entry_type: row.entry_type,
    amount: asMoneyNumber(row.amount),
    remarks: row.remarks,
  }));
}

export async function createAccount(input: CreateAccountInput): Promise<AccountRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name: input.name,
      opening_balance: asMoneyNumber(input.opening_balance),
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error || !data) {
    throwAccountWriteError(error, "Unable to create account.");
  }

  return getAccountRow(data.id);
}

export async function updateAccount(input: UpdateAccountInput): Promise<AccountRecord> {
  await requireActiveAdmin();
  const existing = await getAccountRow(input.id);
  const nextOpening = asMoneyNumber(input.opening_balance);

  if (!moneyEquals(existing.opening_balance, nextOpening) && existing.entry_count > 0) {
    throw new AppError("INTEGRITY", "Opening balance cannot be changed after entries exist.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      opening_balance: nextOpening,
    })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throwAccountWriteError(error, "Unable to update account.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Account was not found.");
  }

  return getAccountRow(data.id);
}

export async function setAccountActive(input: SetAccountActiveInput): Promise<AccountRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update account.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Account was not found.");
  }

  return getAccountRow(data.id);
}

export async function deleteAccount(id: string): Promise<{ ok: true }> {
  await requireActiveAdmin();
  const existing = await getAccountRow(id);
  if (existing.entry_count > 0) {
    throw new AppError("INTEGRITY", "This account has entries and cannot be deleted.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throwAccountWriteError(error, "Unable to delete account.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Account was not found.");
  }

  return { ok: true };
}

export type AccountOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export async function listAccountOptions(): Promise<AccountOption[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL", "Unable to load accounts.");
  }

  return data ?? [];
}
