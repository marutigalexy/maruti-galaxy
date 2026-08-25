import { generateXlsx, type XlsxColumn } from "@/lib/api/xlsx";
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
  OutstandingPartiesInput,
  ProfitLossInput,
  SalaryReportInput,
} from "@/lib/validation/reports";
import { EXPORT_REPORT_MAX_ROWS } from "@/lib/validation/reports";
import { listEntries, type EntrySummary, type ListedEntries } from "@/services/entries/entries-service";
import { exportInvoicesXlsx, listInvoices, type InvoiceListRecord } from "@/services/invoices/invoices-service";
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
  total_than: number;
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

export async function exportJobWorkReportXlsx(
  input: JobWorkReportInput,
): Promise<{ buffer: Buffer; count: number }> {
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
  const columns: XlsxColumn[] = [
    { header: "Lot Number", key: "lotNumber", width: 18 },
    { header: "Party", key: "party", width: 25 },
    { header: "Than", key: "than", width: 12, style: { numFmt: "#,##0.000" } },
    { header: "Price", key: "price", width: 15, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Kapan", key: "kapan", width: 12 },
    { header: "Weight", key: "weight", width: 12, style: { numFmt: "#,##0.000" } },
    { header: "Status", key: "status", width: 15 },
    { header: "Sub Jobs", key: "subJobs", width: 10, style: { numFmt: "#,##0" } },
    { header: "Done Than", key: "doneThan", width: 12, style: { numFmt: "#,##0.000" } },
    { header: "Date", key: "date", width: 12 },
  ];
  const rows = records.map((row) => ({
    lotNumber: row.lot_number,
    party: row.party_name,
    than: row.than,
    price: row.price,
    kapan: row.kapan_number,
    weight: row.weight,
    status: row.status,
    subJobs: row.sub_job_count,
    doneThan: row.done_than,
    date: row.created_at.slice(0, 10),
  }));
  const buffer = await generateXlsx([{ name: "Job Work Report", columns, rows: rows.map((r) => Object.values(r)) }]);

  return { buffer, count: records.length };
}

export async function getEntryReport(input: ListEntriesInput): Promise<ListedEntries> {
  return listEntries(input);
}

export async function getOutstandingReport(
  input: ListInvoicesInput,
): Promise<Paginated<InvoiceListRecord>> {
  return listInvoices(input);
}

export async function exportOutstandingReportXlsx(
  input: ListInvoicesInput,
): Promise<{ buffer: Buffer; count: number }> {
  return exportInvoicesXlsx(input);
}

export type PartyOutstandingRow = {
  id: string;
  company_name: string;
  mobile_number: string;
  total_billed: number;
  total_paid: number;
  outstanding: number;
  status: "Unpaid" | "Partially Paid" | "Paid";
};

async function computePartyOutstandingRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  partyIds: string[],
): Promise<Map<string, PartyOutstandingRow>> {
  const rowsMap = new Map<string, PartyOutstandingRow>();

  if (partyIds.length === 0) {
    return rowsMap;
  }

  const CHUNK_SIZE = 100;
  const allJobs: Array<{ id: string; party_id: string }> = [];

  for (let i = 0; i < partyIds.length; i += CHUNK_SIZE) {
    const chunk = partyIds.slice(i, i + CHUNK_SIZE);
    const { data: jobs, error: jobsError } = await supabase
      .from("job_works")
      .select("id, party_id")
      .in("party_id", chunk);

    if (jobsError) {
      throw new AppError("INTERNAL", "Unable to load job works for outstanding report.");
    }
    if (jobs) {
      allJobs.push(...jobs);
    }
  }

  const jobIds = allJobs.map((j) => j.id);
  const partyIdByJobId = new Map<string, string>();
  for (const job of allJobs) {
    partyIdByJobId.set(job.id, job.party_id);
  }

  if (jobIds.length > 0) {
    for (let i = 0; i < jobIds.length; i += CHUNK_SIZE) {
      const chunk = jobIds.slice(i, i + CHUNK_SIZE);
      const { data: invoices, error: invError } = await supabase
        .from("v_invoice_outstanding")
        .select("job_work_id, amount, allocated, outstanding")
        .in("job_work_id", chunk);

      if (invError) {
        throw new AppError("INTERNAL", "Unable to load invoice outstanding data.");
      }

      for (const inv of invoices ?? []) {
        const jobWorkId = inv.job_work_id;
        if (!jobWorkId) continue;
        const partyId = partyIdByJobId.get(jobWorkId);
        if (!partyId) continue;

        const existing = rowsMap.get(partyId) ?? {
          id: partyId,
          company_name: "",
          mobile_number: "",
          total_billed: 0,
          total_paid: 0,
          outstanding: 0,
          status: "Paid" as const,
        };

        existing.total_billed += asMoneyNumber(inv.amount);
        existing.total_paid += asMoneyNumber(inv.allocated);
        existing.outstanding += asMoneyNumber(inv.outstanding);
        rowsMap.set(partyId, existing);
      }
    }
  }

  return rowsMap;
}

function deriveStatus(row: PartyOutstandingRow): PartyOutstandingRow {
  if (row.total_billed === 0 || row.outstanding <= 0.005) {
    return { ...row, status: "Paid" };
  }
  if (row.total_paid > 0) {
    return { ...row, status: "Partially Paid" };
  }
  return { ...row, status: "Unpaid" };
}

export async function getPartyOutstandingReport(
  input: OutstandingPartiesInput,
): Promise<Paginated<PartyOutstandingRow>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("parties")
    .select("id, company_name, mobile_number", { count: "exact" })
    .order("company_name", { ascending: true });

  if (input.search.trim() !== "") {
    query = query.ilike("company_name", `%${escapeIlike(input.search.trim())}%`);
  }

  const { data: parties, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load parties for outstanding report.");
  }

  const partyIds = (parties ?? []).map((p) => p.id);
  const rowsMap = await computePartyOutstandingRows(supabase, partyIds);

  let allRows: PartyOutstandingRow[] = [];
  for (const party of parties ?? []) {
    const row = rowsMap.get(party.id) ?? {
      id: party.id,
      company_name: party.company_name,
      mobile_number: party.mobile_number,
      total_billed: 0,
      total_paid: 0,
      outstanding: 0,
      status: "Paid" as const,
    };
    row.company_name = party.company_name;
    row.mobile_number = party.mobile_number;
    allRows.push(deriveStatus(row));
  }

  if (input.status !== "all") {
    allRows = allRows.filter((r) => r.status === input.status);
  }

  allRows.sort((a, b) => {
    if (a.outstanding !== b.outstanding) {
      return b.outstanding - a.outstanding;
    }
    return a.company_name.localeCompare(b.company_name);
  });

  const totalCount = allRows.length;
  const pageSize = input.pageSize;
  const page = input.page;
  const offset = (page - 1) * pageSize;
  const paginatedRows = allRows.slice(offset, offset + pageSize);

  return paginated(paginatedRows, totalCount, page, pageSize);
}

export async function exportPartyOutstandingReportXlsx(
  input: OutstandingPartiesInput,
): Promise<{ buffer: Buffer; count: number }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("parties")
    .select("id, company_name, mobile_number", { count: "exact" })
    .order("company_name", { ascending: true });

  if (input.search.trim() !== "") {
    query = query.ilike("company_name", `%${escapeIlike(input.search.trim())}%`);
  }

  const { data: parties, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load parties for outstanding report export.");
  }

  const partyIds = (parties ?? []).map((p) => p.id);
  const rowsMap = await computePartyOutstandingRows(supabase, partyIds);

  let allRows: PartyOutstandingRow[] = [];
  for (const party of parties ?? []) {
    const row = rowsMap.get(party.id) ?? {
      id: party.id,
      company_name: party.company_name,
      mobile_number: party.mobile_number,
      total_billed: 0,
      total_paid: 0,
      outstanding: 0,
      status: "Paid" as const,
    };
    row.company_name = party.company_name;
    row.mobile_number = party.mobile_number;
    allRows.push(deriveStatus(row));
  }

  if (input.status !== "all") {
    allRows = allRows.filter((r) => r.status === input.status);
  }

  allRows.sort((a, b) => {
    if (a.outstanding !== b.outstanding) {
      return b.outstanding - a.outstanding;
    }
    return a.company_name.localeCompare(b.company_name);
  });

  if (allRows.length > EXPORT_REPORT_MAX_ROWS) {
    throw csvTooMany("parties");
  }

  const columns: XlsxColumn[] = [
    { header: "Party", key: "party", width: 30 },
    { header: "Mobile", key: "mobile", width: 18 },
    { header: "Total Billed", key: "totalBilled", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Paid Amount", key: "paidAmount", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Outstanding Amount", key: "outstanding", width: 22, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Status", key: "status", width: 18 },
  ];
  const rows = allRows.map((row) => ({
    party: row.company_name,
    mobile: row.mobile_number,
    totalBilled: row.total_billed,
    paidAmount: row.total_paid,
    outstanding: row.outstanding,
    status: row.status,
  }));
  const buffer = await generateXlsx([{ name: "Outstanding Report", columns, rows: rows.map((r) => Object.values(r)) }]);

  return { buffer, count: allRows.length };
}

async function salaryRowsForEmployees(
  employees: Array<{ id: string; name: string }>,
  input: SalaryReportInput,
): Promise<SalaryReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const ids = employees.map((row) => row.id);
  const earned = new Map(ids.map((id) => [id, 0]));
  const paid = new Map(ids.map((id) => [id, 0]));
  const totalThan = new Map(ids.map((id) => [id, 0]));

  if (ids.length > 0) {
    let workQuery = supabase.from("sub_job_employee_work").select("employee_id, earning, done_than, created_at").in("employee_id", ids);
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
      totalThan.set(row.employee_id, (totalThan.get(row.employee_id) ?? 0) + asMoneyNumber(row.done_than));
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
    const thanAmount = totalThan.get(row.id) ?? 0;
    return {
      id: row.id,
      name: row.name,
      earned: earnedAmount,
      paid: paidAmount,
      difference: roundMoney(earnedAmount - paidAmount),
      total_than: thanAmount,
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

  if (input.search && input.search.trim() !== "") {
    const pattern = `%${escapeIlike(input.search.trim())}%`;
    query = query.ilike("name", pattern);
  }

  if (input.employee_id) {
    query = query.eq("id", input.employee_id);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load salary report.");
  }

  return paginated(await salaryRowsForEmployees(data ?? [], input), count ?? 0, input.page, input.pageSize);
}

export async function exportSalaryReportXlsx(
  input: SalaryReportInput,
): Promise<{ buffer: Buffer; count: number }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("employees")
    .select("id, name", { count: "exact" })
    .order("name", { ascending: true })
    .range(0, EXPORT_REPORT_MAX_ROWS - 1);

  if (input.search && input.search.trim() !== "") {
    const pattern = `%${escapeIlike(input.search.trim())}%`;
    query = query.ilike("name", pattern);
  }

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
  const columns: XlsxColumn[] = [
    { header: "Employee", key: "employee", width: 25 },
    { header: "Total Than", key: "totalThan", width: 12, style: { numFmt: "#,##0.000" } },
    { header: "Total Earnings", key: "earned", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Paid Amount", key: "paid", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Remaining Amount", key: "difference", width: 20, style: { numFmt: '"₹"#,##0.00' } },
  ];
  const rows = records.map((row) => ({
    employee: row.name,
    totalThan: row.total_than,
    earned: row.earned,
    paid: row.paid,
    difference: Math.abs(row.difference),
  }));
  const buffer = await generateXlsx([{ name: "Salary Report", columns, rows: rows.map((r) => Object.values(r)) }]);

  return { buffer, count: records.length };
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

export async function exportProfitLossReportXlsx(
  input: ProfitLossInput,
): Promise<{ buffer: Buffer; count: number }> {
  const result = await getProfitLossReport(input);
  const columns: XlsxColumn[] = [
    { header: "Month", key: "month", width: 15 },
    { header: "Total Income", key: "totalIncome", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Total Expense", key: "totalExpense", width: 18, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Net Profit/Loss", key: "net", width: 18, style: { numFmt: '"₹"#,##0.00' } },
  ];
  const rows = result.months.map((row) => ({
    month: row.label,
    totalIncome: row.total_income,
    totalExpense: row.total_expense,
    net: row.net,
  }));
  rows.push({
    month: "Total",
    totalIncome: result.total_income,
    totalExpense: result.total_expense,
    net: result.net,
  });
  const buffer = await generateXlsx([{ name: "Profit & Loss", columns, rows: rows.map((r) => Object.values(r)) }]);

  return { buffer, count: result.months.length + 1 };
}
