import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { AppError } from "@/lib/api/result";
import { firstRpcRow } from "@/lib/api/rpc";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AddEmployeeWorkInput,
  CreateJobInput,
  CreateSubJobInput,
  ListJobsInput,
  UpdateEmployeeWorkInput,
  UpdateJobInput,
  UpdateSubJobInput,
} from "@/lib/validation/jobs";
import type { Database } from "@/types/database";

type JobType = Database["public"]["Enums"]["job_type"];
type JobStatus = Database["public"]["Enums"]["job_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export const JOB_LIST_COLUMNS = selectColumns([
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

const INVOICE_COLUMNS = selectColumns(["id", "invoice_number", "amount", "status", "job_work_id"]);
const SUB_DISPLAY_COLUMNS = selectColumns([
  "id",
  "job_id",
  "lot_number",
  "sequence_no",
  "display_no",
  "than",
  "weight",
  "status",
]);
const WORK_COLUMNS = selectColumns([
  "id",
  "sub_job_id",
  "employee_id",
  "done_than",
  "commission",
  "earning",
  "created_at",
]);

export type JobListSubJob = {
  id: string;
  display_no: string;
  than: number;
  weight: number;
  status: JobStatus;
  remaining_than: number;
};

export type JobListRecord = {
  id: string;
  lot_number: string;
  party_id: string;
  party_name: string;
  job_type: JobType;
  than: number;
  price: number;
  kapan_number: string;
  weight: number;
  status: JobStatus;
  remaining_than: number;
  invoice_id: string | null;
  created_at: string;
  sub_jobs: JobListSubJob[];
};

export type JobWorkRecord = {
  id: string;
  sub_job_id: string;
  employee_id: string;
  employee_name: string;
  done_than: number;
  commission: number;
  earning: number;
  created_at: string;
};

export type JobSubJobRecord = {
  id: string;
  job_id: string;
  sequence_no: number;
  display_no: string;
  than: number;
  weight: number;
  status: JobStatus;
  done_than: number;
  remaining_than: number;
  work: JobWorkRecord[];
};

export type JobInvoiceSummary = {
  id: string;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
};

export type JobDetail = {
  id: string;
  lot_number: string;
  party_id: string;
  party_name: string;
  job_type: JobType;
  than: number;
  allocated_than: number;
  remaining_than: number;
  price: number;
  kapan_number: string;
  weight: number;
  status: JobStatus;
  created_at: string;
  invoice: JobInvoiceSummary | null;
  sub_jobs: JobSubJobRecord[];
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function emptyPage(input: ListJobsInput): Paginated<JobListRecord> {
  return paginated([], 0, input.page, input.pageSize);
}

async function jobIdsForEmployee(employeeId: string): Promise<string[] | null> {
  const supabase = await createSupabaseServerClient();
  const { data: workRows, error: workError } = await supabase
    .from("sub_job_employee_work")
    .select("sub_job_id")
    .eq("employee_id", employeeId);

  if (workError) {
    throw new AppError("INTERNAL", "Unable to load jobs.");
  }

  const subJobIds = uniqueIds((workRows ?? []).map((row) => row.sub_job_id));
  if (subJobIds.length === 0) {
    return [];
  }

  const { data: subRows, error: subError } = await supabase
    .from("sub_jobs")
    .select("job_id")
    .in("id", subJobIds);

  if (subError) {
    throw new AppError("INTERNAL", "Unable to load jobs.");
  }

  return uniqueIds((subRows ?? []).map((row) => row.job_id));
}

async function jobIdsForSearch(search: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const pattern = `%${escapeIlike(search)}%`;

  const [{ data: lots, error: lotError }, { data: subs, error: subError }] = await Promise.all([
    supabase.from("job_works").select("id").ilike("lot_number", pattern),
    supabase.from("v_sub_jobs_display").select("job_id").ilike("display_no", pattern),
  ]);

  if (lotError || subError) {
    throw new AppError("INTERNAL", "Unable to load jobs.");
  }

  return uniqueIds([
    ...(lots ?? []).map((row) => row.id),
    ...(subs ?? []).map((row) => row.job_id),
  ]);
}

export async function listJobs(input: ListJobsInput): Promise<Paginated<JobListRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  let allowedIds: string[] | null = null;

  if (input.search.trim() !== "") {
    allowedIds = await jobIdsForSearch(input.search.trim());
    if (allowedIds.length === 0) {
      return emptyPage(input);
    }
  }

  if (input.employee_id) {
    const employeeJobIds = await jobIdsForEmployee(input.employee_id);
    if (!employeeJobIds || employeeJobIds.length === 0) {
      return emptyPage(input);
    }
    allowedIds = allowedIds
      ? allowedIds.filter((id) => employeeJobIds.includes(id))
      : employeeJobIds;
    if (allowedIds.length === 0) {
      return emptyPage(input);
    }
  }

  let query = supabase
    .from("job_works")
    .select(JOB_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  if (allowedIds) {
    query = query.in("id", allowedIds);
  }

  if (input.status !== "all") {
    query = query.eq("status", input.status);
  }

  if (input.job_type !== "all") {
    query = query.eq("job_type", input.job_type);
  }

  if (input.party_id) {
    query = query.eq("party_id", input.party_id);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load jobs.");
  }

  const rows = data ?? [];
  const partyIds = uniqueIds(rows.map((row) => row.party_id));
  const jobIds = rows.map((row) => row.id);
  const partyNames = new Map<string, string>();
  const allocated = new Map<string, number>();
  const invoiceIds = new Map<string, string>();
  const subsByJob = new Map<string, JobListSubJob[]>();

  if (partyIds.length > 0) {
    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select("id, company_name")
      .in("id", partyIds);

    if (partyError) {
      throw new AppError("INTERNAL", "Unable to load jobs.");
    }

    for (const party of parties ?? []) {
      partyNames.set(party.id, party.company_name);
    }
  }

  if (jobIds.length > 0) {
    const { data: subRows, error: subError } = await supabase
      .from("v_sub_jobs_display")
      .select(SUB_DISPLAY_COLUMNS)
      .in("job_id", jobIds)
      .order("sequence_no", { ascending: true });

    if (subError) {
      throw new AppError("INTERNAL", "Unable to load jobs.");
    }

    const pendingSubs: Array<JobListSubJob & { job_id: string }> = [];
    for (const row of subRows ?? []) {
      if (!row.id || !row.job_id || !row.display_no || !row.status) {
        continue;
      }
      const than = asMoneyNumber(row.than);
      pendingSubs.push({
        id: row.id,
        job_id: row.job_id,
        display_no: row.display_no,
        than,
        weight: asMoneyNumber(row.weight),
        status: row.status,
        remaining_than: than,
      });
      allocated.set(row.job_id, (allocated.get(row.job_id) ?? 0) + than);
    }

    const subIds = pendingSubs.map((sub) => sub.id);
    const doneBySub = new Map<string, number>();
    if (subIds.length > 0) {
      const { data: workRows, error: workError } = await supabase
        .from("sub_job_employee_work")
        .select("sub_job_id, done_than")
        .in("sub_job_id", subIds);

      if (workError) {
        throw new AppError("INTERNAL", "Unable to load jobs.");
      }

      for (const row of workRows ?? []) {
        doneBySub.set(row.sub_job_id, (doneBySub.get(row.sub_job_id) ?? 0) + asMoneyNumber(row.done_than));
      }
    }

    for (const sub of pendingSubs) {
      const list = subsByJob.get(sub.job_id) ?? [];
      list.push({
        id: sub.id,
        display_no: sub.display_no,
        than: sub.than,
        weight: sub.weight,
        status: sub.status,
        remaining_than: sub.than - (doneBySub.get(sub.id) ?? 0),
      });
      subsByJob.set(sub.job_id, list);
    }

    const { data: invoiceRows, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, job_work_id")
      .in("job_work_id", jobIds);

    if (invoiceError) {
      throw new AppError("INTERNAL", "Unable to load jobs.");
    }

    for (const invoice of invoiceRows ?? []) {
      invoiceIds.set(invoice.job_work_id, invoice.id);
    }
  }

  return paginated(
    rows.map((row) => {
      const than = asMoneyNumber(row.than);
      const used = allocated.get(row.id) ?? 0;
      return {
        id: row.id,
        lot_number: row.lot_number,
        party_id: row.party_id,
        party_name: partyNames.get(row.party_id) ?? "—",
        job_type: row.job_type,
        than,
        price: asMoneyNumber(row.price),
        kapan_number: row.kapan_number,
        weight: asMoneyNumber(row.weight),
        status: row.status,
        remaining_than: than - used,
        invoice_id: invoiceIds.get(row.id) ?? null,
        created_at: row.created_at,
        sub_jobs: subsByJob.get(row.id) ?? [],
      };
    }),
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getJob(id: string): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from("job_works")
    .select(JOB_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (jobError) {
    throw new AppError("INTERNAL", "Unable to load job.");
  }

  if (!job) {
    throw new AppError("NOT_FOUND", "Job was not found.");
  }

  const [{ data: party }, { data: invoice }, { data: subRows, error: subError }] = await Promise.all([
    supabase.from("parties").select("company_name").eq("id", job.party_id).maybeSingle(),
    supabase.from("invoices").select(INVOICE_COLUMNS).eq("job_work_id", id).maybeSingle(),
    supabase.from("v_sub_jobs_display").select(SUB_DISPLAY_COLUMNS).eq("job_id", id).order("sequence_no", {
      ascending: true,
    }),
  ]);

  if (subError) {
    throw new AppError("INTERNAL", "Unable to load job.");
  }

  const subJobs = subRows ?? [];
  const subIds = uniqueIds(subJobs.map((row) => row.id));
  const workBySub = new Map<string, JobWorkRecord[]>();
  const employeeNames = new Map<string, string>();

  if (subIds.length > 0) {
    const { data: workRows, error: workError } = await supabase
      .from("sub_job_employee_work")
      .select(WORK_COLUMNS)
      .in("sub_job_id", subIds)
      .order("created_at", { ascending: true });

    if (workError) {
      throw new AppError("INTERNAL", "Unable to load job.");
    }

    const employeeIds = uniqueIds((workRows ?? []).map((row) => row.employee_id));
    if (employeeIds.length > 0) {
      const { data: employees, error: employeeError } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", employeeIds);

      if (employeeError) {
        throw new AppError("INTERNAL", "Unable to load job.");
      }

      for (const employee of employees ?? []) {
        employeeNames.set(employee.id, employee.name);
      }
    }

    for (const row of workRows ?? []) {
      const list = workBySub.get(row.sub_job_id) ?? [];
      list.push({
        id: row.id,
        sub_job_id: row.sub_job_id,
        employee_id: row.employee_id,
        employee_name: employeeNames.get(row.employee_id) ?? "—",
        done_than: asMoneyNumber(row.done_than),
        commission: asMoneyNumber(row.commission),
        earning: asMoneyNumber(row.earning),
        created_at: row.created_at,
      });
      workBySub.set(row.sub_job_id, list);
    }
  }

  const detailSubs: JobSubJobRecord[] = subJobs.flatMap((row) => {
    if (!row.id || !row.job_id || !row.display_no || row.sequence_no == null || !row.status) {
      return [];
    }
    const than = asMoneyNumber(row.than);
    const work = workBySub.get(row.id) ?? [];
    const done = work.reduce((sum, item) => sum + item.done_than, 0);
    return [
      {
        id: row.id,
        job_id: row.job_id,
        sequence_no: row.sequence_no,
        display_no: row.display_no,
        than,
        weight: asMoneyNumber(row.weight),
        status: row.status,
        done_than: done,
        remaining_than: than - done,
        work,
      },
    ];
  });

  const allocated = detailSubs.reduce((sum, sub) => sum + sub.than, 0);
  const than = asMoneyNumber(job.than);

  return {
    id: job.id,
    lot_number: job.lot_number,
    party_id: job.party_id,
    party_name: party?.company_name ?? "—",
    job_type: job.job_type,
    than,
    allocated_than: allocated,
    remaining_than: than - allocated,
    price: asMoneyNumber(job.price),
    kapan_number: job.kapan_number,
    weight: asMoneyNumber(job.weight),
    status: job.status,
    created_at: job.created_at,
    invoice: invoice
      ? {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: asMoneyNumber(invoice.amount),
          status: invoice.status,
        }
      : null,
    sub_jobs: detailSubs,
  };
}

export async function createJob(input: CreateJobInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_job_with_invoice", {
    p_party_id: input.party_id,
    p_job_type: input.job_type,
    p_than: asMoneyNumber(input.than),
    p_price: asMoneyNumber(input.price),
    p_kapan_number: input.kapan_number,
    p_weight: asMoneyNumber(input.weight),
    p_status: input.status,
  });

  if (error) {
    throw error;
  }

  const created = firstRpcRow(data);
  if (!created?.job_id) {
    throw new AppError("INTERNAL", "Unable to create job.");
  }

  return getJob(created.job_id);
}

export async function updateJob(input: UpdateJobInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_job_with_invoice_recalc", {
    p_job_id: input.id,
    p_than: asMoneyNumber(input.than),
    p_price: asMoneyNumber(input.price),
    p_kapan_number: input.kapan_number,
    p_weight: asMoneyNumber(input.weight),
    p_status: input.status,
    p_job_type: input.job_type,
  });

  if (error) {
    throw error;
  }

  const updated = firstRpcRow(data);
  if (!updated?.job_id) {
    throw new AppError("NOT_FOUND", "Job was not found.");
  }

  return getJob(updated.job_id);
}

export async function createSubJob(input: CreateSubJobInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_sub_job", {
    p_job_id: input.job_id,
    p_than: asMoneyNumber(input.than),
    p_weight: asMoneyNumber(input.weight),
    p_status: input.status,
  });

  if (error) {
    throw error;
  }

  const created = firstRpcRow(data);
  if (!created?.job_id) {
    throw new AppError("INTERNAL", "Unable to create sub-job.");
  }

  return getJob(created.job_id);
}

export async function updateSubJob(input: UpdateSubJobInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_sub_job", {
    p_sub_job_id: input.id,
    p_than: asMoneyNumber(input.than),
    p_weight: asMoneyNumber(input.weight),
    p_status: input.status,
  });

  if (error) {
    throw error;
  }

  const updated = firstRpcRow(data);
  if (!updated?.job_id) {
    throw new AppError("NOT_FOUND", "Sub-job was not found.");
  }

  return getJob(updated.job_id);
}

export async function addEmployeeWork(input: AddEmployeeWorkInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("add_employee_work", {
    p_sub_job_id: input.sub_job_id,
    p_employee_id: input.employee_id,
    p_done_than: asMoneyNumber(input.done_than),
  });

  if (error) {
    throw error;
  }

  const created = firstRpcRow(data);
  if (!created?.sub_job_id) {
    throw new AppError("INTERNAL", "Unable to record work.");
  }

  const { data: sub, error: subError } = await supabase
    .from("sub_jobs")
    .select("job_id")
    .eq("id", created.sub_job_id)
    .maybeSingle();

  if (subError || !sub) {
    throw new AppError("INTERNAL", "Unable to record work.");
  }

  return getJob(sub.job_id);
}

export async function updateEmployeeWork(input: UpdateEmployeeWorkInput): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_employee_work", {
    p_work_id: input.id,
    p_done_than: asMoneyNumber(input.done_than),
  });

  if (error) {
    throw error;
  }

  const updated = firstRpcRow(data);
  if (!updated?.sub_job_id) {
    throw new AppError("NOT_FOUND", "Work record was not found.");
  }

  const { data: sub, error: subError } = await supabase
    .from("sub_jobs")
    .select("job_id")
    .eq("id", updated.sub_job_id)
    .maybeSingle();

  if (subError || !sub) {
    throw new AppError("INTERNAL", "Unable to update work.");
  }

  return getJob(sub.job_id);
}

export async function deleteEmployeeWork(id: string): Promise<JobDetail> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("sub_job_employee_work")
    .select("sub_job_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new AppError("INTERNAL", "Unable to delete work.");
  }

  if (!existing) {
    throw new AppError("NOT_FOUND", "Work record was not found.");
  }

  const { data: sub } = await supabase
    .from("sub_jobs")
    .select("job_id")
    .eq("id", existing.sub_job_id)
    .maybeSingle();

  const { error } = await supabase.rpc("delete_employee_work", { p_work_id: id });
  if (error) {
    throw error;
  }

  if (!sub) {
    throw new AppError("INTERNAL", "Unable to delete work.");
  }

  return getJob(sub.job_id);
}
