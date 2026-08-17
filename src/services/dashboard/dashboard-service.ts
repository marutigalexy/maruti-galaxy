import { asMoneyNumber } from "@/lib/api/numbers";
import { AppError } from "@/lib/api/result";
import { firstRpcRow } from "@/lib/api/rpc";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { currentMonthRange } from "@/lib/dates/month";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];
type EntryType = Database["public"]["Enums"]["entry_type"];

export type DashboardAccountBalance = {
  id: string;
  name: string;
  current_balance: number;
};

export type DashboardRecentJob = {
  id: string;
  lot_number: string;
  party_name: string;
  status: JobStatus;
  created_at: string;
};

export type DashboardRecentEntry = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  amount: number;
  account_name: string;
};

export type DashboardSnapshot = {
  month_from: string;
  month_to: string;
  jobs_total: number;
  jobs_pending: number;
  jobs_progress: number;
  jobs_completed: number;
  total_than: number;
  employee_earnings: number;
  month_income: number;
  month_expense: number;
  outstanding: number;
  accounts: DashboardAccountBalance[];
  recent_jobs: DashboardRecentJob[];
  recent_entries: DashboardRecentEntry[];
};

export async function getDashboard(): Promise<DashboardSnapshot> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const month = currentMonthRange();

  const [kpiResult, accountRows, recentJobRows, recentEntryRows] = await Promise.all([
    supabase.rpc("dashboard_kpis", { p_from: month.date_from, p_to: month.date_to }),
    supabase
      .from("v_account_balances")
      .select("account_id, name, current_balance")
      .order("name", { ascending: true }),
    supabase
      .from("job_works")
      .select("id, lot_number, party_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("entries")
      .select("id, entry_date, entry_type, amount, account_id")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (kpiResult.error || accountRows.error || recentJobRows.error || recentEntryRows.error) {
    throw new AppError("INTERNAL", "Unable to load dashboard.");
  }

  const kpis = firstRpcRow(kpiResult.data);
  if (!kpis) {
    throw new AppError("INTERNAL", "Unable to load dashboard.");
  }

  const partyIds = [...new Set((recentJobRows.data ?? []).map((row) => row.party_id))];
  const accountIds = [...new Set((recentEntryRows.data ?? []).map((row) => row.account_id))];
  const partyNames = new Map<string, string>();
  const accountNames = new Map<string, string>();

  if (partyIds.length > 0) {
    const { data: parties, error } = await supabase.from("parties").select("id, company_name").in("id", partyIds);
    if (error) {
      throw new AppError("INTERNAL", "Unable to load dashboard.");
    }
    for (const party of parties ?? []) {
      partyNames.set(party.id, party.company_name);
    }
  }
  if (accountIds.length > 0) {
    const { data: accounts, error } = await supabase.from("accounts").select("id, name").in("id", accountIds);
    if (error) {
      throw new AppError("INTERNAL", "Unable to load dashboard.");
    }
    for (const account of accounts ?? []) {
      accountNames.set(account.id, account.name);
    }
  }

  return {
    month_from: month.date_from,
    month_to: month.date_to,
    jobs_total: asMoneyNumber(kpis.jobs_total),
    jobs_pending: asMoneyNumber(kpis.jobs_pending),
    jobs_progress: asMoneyNumber(kpis.jobs_progress),
    jobs_completed: asMoneyNumber(kpis.jobs_completed),
    total_than: asMoneyNumber(kpis.total_than),
    employee_earnings: asMoneyNumber(kpis.employee_earnings),
    month_income: asMoneyNumber(kpis.month_income),
    month_expense: asMoneyNumber(kpis.month_expense),
    outstanding: asMoneyNumber(kpis.outstanding),
    accounts: (accountRows.data ?? [])
      .filter((row) => row.account_id && row.name !== null)
      .map((row) => ({
        id: row.account_id as string,
        name: row.name as string,
        current_balance: asMoneyNumber(row.current_balance),
      })),
    recent_jobs: (recentJobRows.data ?? []).map((row) => ({
      id: row.id,
      lot_number: row.lot_number,
      party_name: partyNames.get(row.party_id) ?? "—",
      status: row.status,
      created_at: row.created_at,
    })),
    recent_entries: (recentEntryRows.data ?? []).map((row) => ({
      id: row.id,
      entry_date: row.entry_date,
      entry_type: row.entry_type,
      amount: asMoneyNumber(row.amount),
      account_name: accountNames.get(row.account_id) ?? "—",
    })),
  };
}
