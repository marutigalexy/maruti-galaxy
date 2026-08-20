import { toCsv } from "@/lib/api/csv";
import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { groupProfitLossByMonth, type ProfitLossMonthRow } from "@/lib/reports/profit-loss";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { ListInvoicesInput } from "@/lib/validation/invoices";
import type {
  JobWorkReportInput,
  ProfitLossInput,
  SalaryReportInput,
} from "@/lib/validation/reports";
import { EXPORT_REPORT_MAX_ROWS } from "@/lib/validation/reports";
import { listEntries, type EntrySummary, type ListedEntries } from "@/services/entries/entries-service";
import { exportInvoicesCsv, listInvoices, type InvoiceListRecord } from "@/services/invoices/invoices-service";
import type { Database } from "@/types/database";

type JobType = Database["public"]["Enums"]["job_type"];
type JobStatus = Database["public"]["Enums"]["job_status"];

const JOB_COLUMNS = selectColumns([
  "id",
  "lot_number",
  "party_id",
  "job_type",
  "than",
  "price",
  "kapan_number",
  "weight",
  "status",
  "created_at",
]);

export type JobWorkReportRow = {
  id: string;
  lot_number: string;
  party_name: string;
  job_type: JobType;
  than: number;
  price: number;
  kapan_number: string;
  weight: number;
  status: JobStatus;
  sub_job_count: number;
  done_than: number;
  created_at: string;
};

export type SalaryReportRow = {
  id: string;
  name: string;
  earned: number;
  paid: number;
  difference: number;
};

export type { ProfitLossMonthRow };

export type ProfitLossReport = EntrySummary & {
  months: ProfitLossMonthRow[];
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function csvTooMany(entity: string): AppError {
  return new AppError("VALIDATION", `Too many ${entity} to export. Narrow the filters and try again.`);
}

type JobWorkQuery = {
  eq: (column: string, value: string) => JobWorkQuery;
  gte: (column: string, value: string) => JobWorkQuery;
  lte: (column: string, value: string) => JobWorkQuery;
  ilike: (column: string, value: string) => JobWorkQuery;
};

function applyJobWorkFilters<T extends JobWorkQuery>(query: T, input: JobWorkReportInput): T {
  let next: JobWorkQuery = query;
  if (input.search.trim() !== "") {
    next = next.ilike("lot_number", `%${escapeIlike(input.search.trim())}%`);
  }
  if (input.status !== "all") {
    next = next.eq("status", input.status);
  }
  if (input.job_type !== "all") {
    next = next.eq("job_type", input.job_type);
  }
  if (input.party_id) {
    next = next.eq("party_id", input.party_id);
  }
  if (input.date_from) {
    next = next.gte("created_at", input.date_from);
  }
  if (input.date_to) {
    next = next.lte("created_at", `${input.date_to}T23:59:59.999`);
  }
  return next as T;
}

async function hydrateJobWorkRows(
  rows: Array<{
    id: string;
    lot_number: string;
    party_id: string;
    job_type: JobType;
    than: number;
    price: number;
    kapan_number: string;
    weight: number;
    status: JobStatus;
    created_at: string;
  }>,
): Promise<JobWorkReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const jobIds = rows.map((row) => row.id);
  const partyIds = uniqueIds(rows.map((row) => row.party_id));
  const partyNames = new Map<string, string>();
  const subCounts = new Map<string, number>();
  const doneThan = new Map<string, number>();

  if (partyIds.length > 0) {
    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select("id, company_name")
      .in("id", partyIds);
    if (partyError) {
      throw new AppError("INTERNAL", "Unable to load job work report.");
    }
    for (const party of parties ?? []) {
      partyNames.set(party.id, party.company_name);
    }
  }

  if (jobIds.length > 0) {
    const { data: subs, error: subError } = await supabase
      .from("sub_jobs")
      .select("id, job_id")
      .in("job_id", jobIds);
    if (subError) {
      throw new AppError("INTERNAL", "Unable to load job work report.");
    }
    const subIds: string[] = [];
    const subJob = new Map<string, string>();
    for (const sub of subs ?? []) {
      subCounts.set(sub.job_id, (subCounts.get(sub.job_id) ?? 0) + 1);
      subIds.push(sub.id);
      subJob.set(sub.id, sub.job_id);
    }
    if (subIds.length > 0) {
      const { data: work, error: workError } = await supabase
        .from("sub_job_employee_work")
        .select("sub_job_id, done_than")
        .in("sub_job_id", subIds);
      if (workError) {
        throw new AppError("INTERNAL", "Unable to load job work report.");
      }
      for (const row of work ?? []) {
        const jobId = subJob.get(row.sub_job_id);
        if (!jobId) {
          continue;
        }
        doneThan.set(jobId, (doneThan.get(jobId) ?? 0) + asMoneyNumber(row.done_than));
      }
    }
  }

  return rows.map((row) => ({
    id: row.id,
    lot_number: row.lot_number,
    party_name: partyNames.get(row.party_id) ?? "—",
    job_type: row.job_type,
    than: asMoneyNumber(row.than),
    price: asMoneyNumber(row.price),
    kapan_number: row.kapan_number,
    weight: asMoneyNumber(row.weight),
    status: row.status,
    sub_job_count: subCounts.get(row.id) ?? 0,
    done_than: doneThan.get(row.id) ?? 0,
    created_at: row.created_at,
  }));
}

export async function getJobWorkReport(
  input: JobWorkReportInput,
): Promise<Paginated<JobWorkReportRow>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);

  let query = supabase
    .from("job_works")
    .select(JOB_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  query = applyJobWorkFilters(query, input);

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load job work report.");
  }

  return paginated(await hydrateJobWorkRows(data ?? []), count ?? 0, input.page, input.pageSize);
}

export async function exportJobWorkReportCsv(
  input: JobWorkReportInput,
): Promise<{ csv: string; count: number }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("job_works")
    .select(JOB_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, EXPORT_REPORT_MAX_ROWS - 1);

  query = applyJobWorkFilters(query, input);

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to export job work report.");
  }
  if ((count ?? 0) > EXPORT_REPORT_MAX_ROWS) {
    throw csvTooMany("jobs");
  }

  const records = await hydrateJobWorkRows(data ?? []);
  const csv = toCsv(
    [
      "Lot Number",
      "Party",
      "Job Type",
      "Than",
      "Price",
      "Kapan",
      "Weight",
      "Status",
      "Sub Jobs",
      "Done Than",
      "Date",
    ],
    records.map((row) => [
      row.lot_number,
      row.party_name,
      row.job_type,
      row.than,
      row.price.toFixed(2),
      row.kapan_number,
      row.weight,
      row.status,
      row.sub_job_count,
      row.done_than,
      row.created_at.slice(0, 10),
    ]),
  );

  return { csv: `\uFEFF${csv}`, count: records.length };
}

export async function getEntryReport(input: ListEntriesInput): Promise<ListedEntries> {
  return listEntries(input);
}

export async function getOutstandingReport(
  input: ListInvoicesInput,
): Promise<Paginated<InvoiceListRecord>> {
  return listInvoices(input);
}

export async function exportOutstandingReportCsv(
  input: ListInvoicesInput,
): Promise<{ csv: string; count: number }> {
  return exportInvoicesCsv(input);
}

async function salaryRowsForEmployees(
  employees: Array<{ id: string; name: string }>,
  input: SalaryReportInput,
): Promise<SalaryReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const ids = employees.map((row) => row.id);
  const earned = new Map(ids.map((id) => [id, 0]));
  const paid = new Map(ids.map((id) => [id, 0]));

  if (ids.length > 0) {
    let workQuery = supabase.from("sub_job_employee_work").select("employee_id, earning, created_at").in("employee_id", ids);
    if (input.date_from) {
      workQuery = workQuery.gte("created_at", input.date_from);
    }
    if (input.date_to) {
      workQuery = workQuery.lte("created_at", `${input.date_to}T23:59:59.999`);
    }
    const { data: workRows, error: workError } = await workQuery;
    if (workError) {
      throw new AppError("INTERNAL", "Unable to load salary report.");
    }
    for (const row of workRows ?? []) {
      earned.set(row.employee_id, (earned.get(row.employee_id) ?? 0) + asMoneyNumber(row.earning));
    }

    let payQuery = supabase
      .from("entries")
      .select("employee_id, amount, entry_date")
      .eq("entry_type", "Expense")
      .in("employee_id", ids);
    if (input.date_from) {
      payQuery = payQuery.gte("entry_date", input.date_from);
    }
    if (input.date_to) {
      payQuery = payQuery.lte("entry_date", input.date_to);
    }
    const { data: payRows, error: payError } = await payQuery;
    if (payError) {
      throw new AppError("INTERNAL", "Unable to load salary report.");
    }
    for (const row of payRows ?? []) {
      if (!row.employee_id) {
        continue;
      }
      paid.set(row.employee_id, (paid.get(row.employee_id) ?? 0) + asMoneyNumber(row.amount));
    }
  }

  return employees.map((row) => {
    const earnedAmount = earned.get(row.id) ?? 0;
    const paidAmount = paid.get(row.id) ?? 0;
    return {
      id: row.id,
      name: row.name,
      earned: earnedAmount,
      paid: paidAmount,
      difference: roundMoney(earnedAmount - paidAmount),
    };
  });
}

export async function getSalaryReport(
  input: SalaryReportInput,
): Promise<Paginated<SalaryReportRow>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);

  let query = supabase
    .from("employees")
    .select("id, name", { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + input.pageSize - 1);

  if (input.employee_id) {
    query = query.eq("id", input.employee_id);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load salary report.");
  }

  return paginated(await salaryRowsForEmployees(data ?? [], input), count ?? 0, input.page, input.pageSize);
}

export async function exportSalaryReportCsv(
  input: SalaryReportInput,
): Promise<{ csv: string; count: number }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("employees")
    .select("id, name", { count: "exact" })
    .order("name", { ascending: true })
    .range(0, EXPORT_REPORT_MAX_ROWS - 1);

  if (input.employee_id) {
    query = query.eq("id", input.employee_id);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to export salary report.");
  }
  if ((count ?? 0) > EXPORT_REPORT_MAX_ROWS) {
    throw csvTooMany("employees");
  }

  const records = await salaryRowsForEmployees(data ?? [], input);
  const csv = toCsv(
    ["Employee", "Total Earnings", "Paid Amount", "Remaining Amount"],
    records.map((row) => [row.name, row.earned.toFixed(2), row.paid.toFixed(2), row.difference.toFixed(2)]),
  );

  return { csv: `\uFEFF${csv}`, count: records.length };
}

export async function getProfitLossReport(input: ProfitLossInput): Promise<ProfitLossReport> {
  await requireActiveAdmin();
  const listed = await listEntries({
    page: 1,
    pageSize: 1,
    search: "",
    entry_type: "all",
    account_id: undefined,
    category_id: undefined,
    party_id: undefined,
    employee_id: undefined,
    date_from: input.date_from,
    date_to: input.date_to,
    sort: "date",
    dir: "desc",
  });

  const supabase = await createSupabaseServerClient();
  let query = supabase.from("entries").select("entry_date, entry_type, amount");
  if (input.date_from) {
    query = query.gte("entry_date", input.date_from);
  }
  if (input.date_to) {
    query = query.lte("entry_date", input.date_to);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load profit and loss.");
  }

  const months = groupProfitLossByMonth(
    (data ?? []).map((row) => ({
      entry_date: row.entry_date,
      entry_type: row.entry_type,
      amount: asMoneyNumber(row.amount),
    })),
  );

  return { ...listed.summary, months };
}

export async function exportProfitLossReportCsv(
  input: ProfitLossInput,
): Promise<{ csv: string; count: number }> {
  const result = await getProfitLossReport(input);
  const rows = result.months.map((row) => [
    row.label,
    row.total_income.toFixed(2),
    row.total_expense.toFixed(2),
    row.net.toFixed(2),
  ]);
  rows.push(["Total", result.total_income.toFixed(2), result.total_expense.toFixed(2), result.net.toFixed(2)]);

  const csv = toCsv(["Month", "Total Income", "Total Expense", "Net Profit/Loss"], rows);
  return { csv: `\uFEFF${csv}`, count: result.months.length };
}
