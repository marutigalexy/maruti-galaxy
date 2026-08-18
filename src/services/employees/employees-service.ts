import { escapeIlike } from "@/lib/api/ilike";
import { asMoneyNumber } from "@/lib/api/numbers";
import { paginated, paginationOffset, type Paginated } from "@/lib/api/pagination";
import { isRestrictViolation, mentionsConstraint } from "@/lib/api/postgres";
import { AppError } from "@/lib/api/result";
import { selectColumns } from "@/lib/api/select";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateEmployeeInput,
  ListEmployeesInput,
  SetEmployeeActiveInput,
  UpdateEmployeeInput,
} from "@/lib/validation/employees";

export const EMPLOYEE_LIST_COLUMNS = selectColumns([
  "id",
  "name",
  "mobile_number",
  "commission",
  "is_active",
  "created_at",
]);

const WORK_COLUMNS = selectColumns(["id", "sub_job_id", "done_than", "commission", "earning", "created_at"]);

export type EmployeeRecord = {
  id: string;
  name: string;
  mobile_number: string;
  commission: number;
  is_active: boolean;
  created_at: string;
};

export type EmployeeWorkRow = {
  id: string;
  done_than: number;
  commission: number;
  earning: number;
  created_at: string;
  lot_number: string | null;
  display_no: string | null;
};

export type EmployeeSummary = {
  total_done_than: number;
  total_earning: number;
  total_paid: number;
  remaining_amount: number;
  work: EmployeeWorkRow[];
};

function toEmployee(row: {
  id: string;
  name: string;
  mobile_number: string;
  commission: number;
  is_active: boolean;
  created_at: string;
}): EmployeeRecord {
  return {
    id: row.id,
    name: row.name,
    mobile_number: row.mobile_number,
    commission: asMoneyNumber(row.commission),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

function throwEmployeeDeleteError(error: unknown): never {
  if (isRestrictViolation(error)) {
    if (mentionsConstraint(error, "sub_job_employee_work")) {
      throw new AppError(
        "INTEGRITY",
        "This employee has work records and cannot be deleted. Deactivate it instead.",
      );
    }
    if (mentionsConstraint(error, "entries")) {
      throw new AppError(
        "INTEGRITY",
        "This employee has accounting entries and cannot be deleted. Deactivate it instead.",
      );
    }
    throw new AppError(
      "INTEGRITY",
      "This employee is in use and cannot be deleted. Deactivate it instead.",
    );
  }

  throw new AppError("INTERNAL", "Unable to delete employee.");
}

export async function listEmployees(input: ListEmployeesInput): Promise<Paginated<EmployeeRecord>> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const offset = paginationOffset(input.page, input.pageSize);
  const search = input.search.trim();

  let query = supabase
    .from("employees")
    .select(EMPLOYEE_LIST_COLUMNS, { count: "exact" })
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
    query = query.or(`name.ilike.${pattern},mobile_number.ilike.${pattern}`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("INTERNAL", "Unable to load employees.");
  }

  return paginated((data ?? []).map(toEmployee), count ?? 0, input.page, input.pageSize);
}

export async function getEmployee(id: string): Promise<EmployeeRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to load employee.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Employee was not found.");
  }

  return toEmployee(data);
}

export async function getEmployeeSummary(id: string): Promise<EmployeeSummary> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: workRows, error: workError } = await supabase
    .from("sub_job_employee_work")
    .select(WORK_COLUMNS)
    .eq("employee_id", id)
    .order("created_at", { ascending: false });

  if (workError) {
    throw new AppError("INTERNAL", "Unable to load employee work.");
  }

  const subJobIds = [...new Set((workRows ?? []).map((row) => row.sub_job_id))];
  const displayBySubJob = new Map<string, { lot_number: string; display_no: string }>();

  if (subJobIds.length > 0) {
    const { data: displays, error: displayError } = await supabase
      .from("v_sub_jobs_display")
      .select("id, lot_number, display_no")
      .in("id", subJobIds);

    if (displayError) {
      throw new AppError("INTERNAL", "Unable to load employee work.");
    }

    for (const row of displays ?? []) {
      if (row.id && row.lot_number && row.display_no) {
        displayBySubJob.set(row.id, { lot_number: row.lot_number, display_no: row.display_no });
      }
    }
  }

  const [{ data: earnings, error: earningsError }, { data: payRows, error: payError }] = await Promise.all([
    supabase
      .from("v_employee_earnings")
      .select("total_done_than, total_earning")
      .eq("employee_id", id)
      .maybeSingle(),
    supabase.from("entries").select("amount").eq("entry_type", "Expense").eq("employee_id", id),
  ]);

  if (earningsError) {
    throw new AppError("INTERNAL", "Unable to load employee earnings.");
  }

  if (payError) {
    throw new AppError("INTERNAL", "Unable to load employee payments.");
  }

  const totalEarning = asMoneyNumber(earnings?.total_earning);
  const totalPaid = (payRows ?? []).reduce((sum, row) => sum + asMoneyNumber(row.amount), 0);

  return {
    total_done_than: asMoneyNumber(earnings?.total_done_than),
    total_earning: totalEarning,
    total_paid: totalPaid,
    remaining_amount: Math.round((totalEarning - totalPaid) * 100) / 100,
    work: (workRows ?? []).map((row) => {
      const display = displayBySubJob.get(row.sub_job_id);
      return {
        id: row.id,
        done_than: asMoneyNumber(row.done_than),
        commission: asMoneyNumber(row.commission),
        earning: asMoneyNumber(row.earning),
        created_at: row.created_at,
        lot_number: display?.lot_number ?? null,
        display_no: display?.display_no ?? null,
      };
    }),
  };
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      name: input.name,
      mobile_number: input.mobile_number,
      commission: asMoneyNumber(input.commission),
      is_active: input.is_active,
    })
    .select(EMPLOYEE_LIST_COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Unable to create employee.");
  }

  return toEmployee(data);
}

export async function updateEmployee(input: UpdateEmployeeInput): Promise<EmployeeRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .update({
      name: input.name,
      mobile_number: input.mobile_number,
      commission: asMoneyNumber(input.commission),
    })
    .eq("id", input.id)
    .select(EMPLOYEE_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update employee.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Employee was not found.");
  }

  return toEmployee(data);
}

export async function setEmployeeActive(input: SetEmployeeActiveInput): Promise<EmployeeRecord> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select(EMPLOYEE_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Unable to update employee.");
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Employee was not found.");
  }

  return toEmployee(data);
}

export async function deleteEmployee(id: string): Promise<{ ok: true }> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throwEmployeeDeleteError(error);
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Employee was not found.");
  }

  return { ok: true };
}

export type EmployeeOption = {
  id: string;
  name: string;
  commission: number;
  is_active: boolean;
};

export async function listEmployeeOptions(): Promise<EmployeeOption[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, commission, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL", "Unable to load employees.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    commission: asMoneyNumber(row.commission),
    is_active: row.is_active,
  }));
}
