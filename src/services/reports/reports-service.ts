import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  JobWorkReportInput,
  PartyLedgerInput,
  ProfitLossInput,
  SalaryReportInput,
} from "@/lib/validation/reports";
import { listEntries, type EntrySummary, type ListedEntries } from "@/services/entries/entries-service";
import { listInvoices, type InvoiceListRecord } from "@/services/invoices/invoices-service";
import type { ListEntriesInput } from "@/lib/validation/entries";
import type { ListInvoicesInput } from "@/lib/validation/invoices";
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

export type PartyLedgerRow = {
  id: string;
  date: string;
  kind: "Invoice" | "Allocation" | "Income" | "Expense";
  reference: string;
  amount: number;
  remarks: string | null;
};

export type ProfitLossReport = EntrySummary;

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function inDateRange(value: string, from?: string, to?: string): boolean {
  const day = value.slice(0, 10);
  if (from && day < from) {
    return false;
  }
  if (to && day > to) {
    return false;
  }
  return true;
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

  if (input.status !== "all") {
    query = query.eq("status", input.status);
  }
  if (input.job_type !== "all") {
    query = query.eq("job_type", input.job_type);
  }
  if (input.party_id) {
    query = query.eq("party_id", input.party_id);
  }
  if (input.date_from) {
    query = query.gte("created_at", input.date_from);
  }
  if (input.date_to) {
    query = query.lte("created_at", `${input.date_to}T23:59:59.999`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Unable to load job work report.");
  }

  const rows = data ?? [];
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

  return paginated(
    rows.map((row) => ({
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
    })),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getEntryReport(input: ListEntriesInput): Promise<ListedEntries> {
  return listEntries(input);
}

export async function getOutstandingReport(
  input: ListInvoicesInput,
): Promise<Paginated<InvoiceListRecord>> {
  return listInvoices(input);
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

  const employees = data ?? [];
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

  return paginated(
    employees.map((row) => {
      const earnedAmount = earned.get(row.id) ?? 0;
      const paidAmount = paid.get(row.id) ?? 0;
      return {
        id: row.id,
        name: row.name,
        earned: earnedAmount,
        paid: paidAmount,
        difference: Math.round((earnedAmount - paidAmount) * 100) / 100,
      };
    }),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getProfitLossReport(input: ProfitLossInput): Promise<ProfitLossReport> {
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
  });
  return listed.summary;
}

export async function getPartyLedger(input: PartyLedgerInput): Promise<Paginated<PartyLedgerRow>> {
  await requireActiveAdmin();
  if (!input.party_id) {
    return paginated([], 0, input.page, input.pageSize);
  }

  const supabase = await createSupabaseServerClient();
  const { data: jobs, error: jobError } = await supabase
    .from("job_works")
    .select("id")
    .eq("party_id", input.party_id);
  if (jobError) {
    throw new AppError("INTERNAL", "Unable to load party ledger.");
  }

  const jobIds = uniqueIds((jobs ?? []).map((row) => row.id));
  const events: PartyLedgerRow[] = [];

  if (jobIds.length > 0) {
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, amount, job_work_id")
      .in("job_work_id", jobIds);
    if (invoiceError) {
      throw new AppError("INTERNAL", "Unable to load party ledger.");
    }
    for (const invoice of invoices ?? []) {
      events.push({
        id: `invoice:${invoice.id}`,
        date: invoice.invoice_date,
        kind: "Invoice",
        reference: invoice.invoice_number,
        amount: asMoneyNumber(invoice.amount),
        remarks: null,
      });
    }

    const invoiceIds = uniqueIds((invoices ?? []).map((row) => row.id));
    if (invoiceIds.length > 0) {
      const { data: allocations, error: allocationError } = await supabase
        .from("entry_invoice_allocations")
        .select("id, invoice_id, entry_id, amount, created_at")
        .in("invoice_id", invoiceIds);
      if (allocationError) {
        throw new AppError("INTERNAL", "Unable to load party ledger.");
      }
      const entryIds = uniqueIds((allocations ?? []).map((row) => row.entry_id));
      const entryDates = new Map<string, string>();
      if (entryIds.length > 0) {
        const { data: entries, error: entryError } = await supabase
          .from("entries")
          .select("id, entry_date")
          .in("id", entryIds);
        if (entryError) {
          throw new AppError("INTERNAL", "Unable to load party ledger.");
        }
        for (const entry of entries ?? []) {
          entryDates.set(entry.id, entry.entry_date);
        }
      }
      const invoiceNumbers = new Map((invoices ?? []).map((row) => [row.id, row.invoice_number]));
      for (const allocation of allocations ?? []) {
        events.push({
          id: `allocation:${allocation.id}`,
          date: entryDates.get(allocation.entry_id) ?? allocation.created_at.slice(0, 10),
          kind: "Allocation",
          reference: invoiceNumbers.get(allocation.invoice_id) ?? "—",
          amount: asMoneyNumber(allocation.amount),
          remarks: "Income allocated to invoice",
        });
      }
    }
  }

  const { data: partyEntries, error: partyEntryError } = await supabase
    .from("entries")
    .select("id, entry_type, entry_date, amount, remarks")
    .eq("party_id", input.party_id);
  if (partyEntryError) {
    throw new AppError("INTERNAL", "Unable to load party ledger.");
  }
  for (const entry of partyEntries ?? []) {
    events.push({
      id: `entry:${entry.id}`,
      date: entry.entry_date,
      kind: entry.entry_type,
      reference: entry.entry_type,
      amount: asMoneyNumber(entry.amount),
      remarks: entry.remarks,
    });
  }

  const filtered = events
    .filter((event) => inDateRange(event.date, input.date_from, input.date_to))
    .sort((left, right) => {
      if (left.date === right.date) {
        return left.id.localeCompare(right.id);
      }
      return left.date.localeCompare(right.date);
    });

  const offset = paginationOffset(input.page, input.pageSize);
  return paginated(
    filtered.slice(offset, offset + input.pageSize),
    filtered.length,
    input.page,
    input.pageSize,
  );
}

export async function getEntryLedger(input: ListEntriesInput): Promise<ListedEntries> {
  return listEntries(input);
}
