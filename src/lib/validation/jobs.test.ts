import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseOrThrow } from "@/lib/validation";
import {
  addEmployeeWorkSchema,
  advanceSubJobStageSchema,
  createJobSchema,
  createSubJobSchema,
  getNextStage,
  listJobsSchema,
  normalizeStages,
  updateJobSchema,
  updateSubJobSchema,
} from "@/lib/validation/jobs";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("stage progression and normalization", () => {
  it("normalizes any permutation of selected stages into the canonical fixed sequence", () => {
    // 3 stages in reverse order
    expect(normalizeStages(["Galaxy", "Dropping", "Sarin"])).toEqual(["Sarin", "Dropping", "Galaxy"]);
    // 2 stages: Sarin + Galaxy
    expect(normalizeStages(["Galaxy", "Sarin"])).toEqual(["Sarin", "Galaxy"]);
    // 2 stages: Dropping + Galaxy
    expect(normalizeStages(["Galaxy", "Dropping"])).toEqual(["Dropping", "Galaxy"]);
    // 2 stages: Sarin + Dropping
    expect(normalizeStages(["Dropping", "Sarin"])).toEqual(["Sarin", "Dropping"]);
    // 1 stage: Sarin
    expect(normalizeStages(["Sarin"])).toEqual(["Sarin"]);
    // 1 stage: Dropping
    expect(normalizeStages(["Dropping"])).toEqual(["Dropping"]);
    // 1 stage: Galaxy
    expect(normalizeStages(["Galaxy"])).toEqual(["Galaxy"]);
  });

  it("advances sequentially skipping unselected stages and finishes at Completed", () => {
    // Pipeline: Sarin -> Galaxy
    const sg = ["Sarin", "Galaxy"];
    expect(getNextStage(sg, "Sarin")).toBe("Galaxy");
    expect(getNextStage(sg, "Galaxy")).toBe("Completed");

    // Pipeline: Dropping -> Galaxy
    const dg = ["Dropping", "Galaxy"];
    expect(getNextStage(dg, "Dropping")).toBe("Galaxy");
    expect(getNextStage(dg, "Galaxy")).toBe("Completed");

    // Pipeline: Sarin -> Dropping -> Galaxy
    const sdg = ["Sarin", "Dropping", "Galaxy"];
    expect(getNextStage(sdg, "Sarin")).toBe("Dropping");
    expect(getNextStage(sdg, "Dropping")).toBe("Galaxy");
    expect(getNextStage(sdg, "Galaxy")).toBe("Completed");

    // Single stage: Sarin
    expect(getNextStage(["Sarin"], "Sarin")).toBe("Completed");
    // Single stage: Dropping
    expect(getNextStage(["Dropping"], "Dropping")).toBe("Completed");
    // Single stage: Galaxy
    expect(getNextStage(["Galaxy"], "Galaxy")).toBe("Completed");
  });
});

describe("job schemas", () => {
  it("requires party, than, price, kapan, and decimal weight", () => {
    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        than: "10",
        price: "1",
        kapan_number: "",
        weight: "1.5",
      }),
    ).toThrow(/Kapan Number is required/);

    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        than: "0",
        price: "1",
        kapan_number: "K1",
        weight: "1.5",
      }),
    ).toThrow(/out of range/i);

    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        than: "10",
        price: "-1",
        kapan_number: "K1",
        weight: "1.5",
      }),
    ).toThrow(/out of range|decimal/i);
  });

  it("creates job as lot container with optional billing_amount", () => {
    const parsed = parseOrThrow(createJobSchema, {
      party_id: UUID,
      than: "10.500",
      price: "12.50",
      kapan_number: " KAPAN-1 ",
      weight: "0.125",
      billing_amount: "150.00",
      lot_number: "J99",
      invoice_number: "INV-0009",
      amount: "999",
    });

    expect(parsed.status).toBe("Pending");
    expect(parsed.kapan_number).toBe("KAPAN-1");
    expect(parsed.billing_amount).toBe("150.00");
    expect(parsed).not.toHaveProperty("lot_number");
    expect(parsed).not.toHaveProperty("invoice_number");
    expect(parsed).not.toHaveProperty("amount");
    expect(parsed).not.toHaveProperty("stages");
    expect(parsed).not.toHaveProperty("current_stage");
  });

  it("validates job_date in createJobSchema and updateJobSchema", () => {
    const validCreate = parseOrThrow(createJobSchema, {
      party_id: UUID,
      than: "10.000",
      price: "100.00",
      kapan_number: "K-100",
      weight: "1.000",
      job_date: "2026-08-31",
    });
    expect(validCreate.job_date).toBe("2026-08-31");

    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        than: "10.000",
        price: "100.00",
        kapan_number: "K-100",
        weight: "1.000",
        job_date: "invalid-date",
      }),
    ).toThrow(/Date must be YYYY-MM-DD/);

    const validUpdate = parseOrThrow(updateJobSchema, {
      id: UUID,
      than: "10.000",
      price: "100.00",
      kapan_number: "K-100",
      weight: "1.000",
      status: "Pending",
      job_date: "2026-08-31",
    });
    expect(validUpdate.job_date).toBe("2026-08-31");

    expect(() =>
      parseOrThrow(updateJobSchema, {
        id: UUID,
        than: "10.000",
        price: "100.00",
        kapan_number: "K-100",
        weight: "1.000",
        status: "Pending",
        job_date: "invalid-date",
      }),
    ).toThrow(/Date must be YYYY-MM-DD/);
  });

  it("normalizes multi-stage selection on subjob creation and sets initial stage", () => {
    const parsed = parseOrThrow(createSubJobSchema, {
      job_id: UUID,
      stages: ["Galaxy", "Sarin"],
      than: "10",
      weight: "0.125",
    });

    expect(parsed.status).toBe("Pending");
    expect(parsed.stages).toEqual(["Sarin", "Galaxy"]);
    expect(parsed.current_stage).toBe("Sarin");
  });

  it("rejects subjob creation with empty stages", () => {
    expect(() =>
      parseOrThrow(createSubJobSchema, {
        job_id: UUID,
        stages: [],
        than: "10",
        weight: "0.125",
      }),
    ).toThrow(/select at least one stage/i);
  });

  it("handles single-stage Dropping subjob creation", () => {
    const parsed = parseOrThrow(createSubJobSchema, {
      job_id: UUID,
      stages: ["Dropping"],
      than: "5",
      weight: "1.000",
    });

    expect(parsed.stages).toEqual(["Dropping"]);
    expect(parsed.current_stage).toBe("Dropping");
  });

  it("accepts status picker and billing_amount values and rejects unknown statuses", () => {
    const updated = parseOrThrow(updateJobSchema, {
      id: UUID,
      than: "1",
      price: "1",
      kapan_number: "K1",
      weight: "0",
      billing_amount: "5000.00",
      status: "Completed",
    });
    expect(updated.status).toBe("Completed");
    expect(updated.billing_amount).toBe("5000.00");

    expect(() =>
      parseOrThrow(updateJobSchema, {
        id: UUID,
        than: "1",
        price: "1",
        kapan_number: "K1",
        weight: "0",
        status: "Cancelled",
      }),
    ).toThrow();
  });

  it("parses job list filters including stage and search", () => {
    expect(parseOrThrow(listJobsSchema, { search: "J01-A", stage: "Sarin" })).toMatchObject({
      search: "J01-A",
      stage: "Sarin",
      status: "all",
      page: 1,
      pageSize: 30,
    });
    expect(() => parseOrThrow(listJobsSchema, { pageSize: 1000 })).toThrow();
  });

  it("parses subjob creation and defaults stages when omitted with integer than", () => {
    const sub = parseOrThrow(createSubJobSchema, {
      job_id: UUID,
      than: "15",
      weight: "3.200",
    });
    expect(sub).toMatchObject({
      job_id: UUID,
      than: "15",
      weight: "3.200",
      stages: ["Sarin"],
      current_stage: "Sarin",
      status: "Pending",
    });

    // Rejects decimals/floats for subjob Than
    expect(() =>
      parseOrThrow(createSubJobSchema, {
        job_id: UUID,
        than: "15.5",
        weight: "3.200",
      }),
    ).toThrow(/Than must be a positive integer/);
  });

  it("requires integer sub-job than and ignores client sequence", () => {
    const parsed = parseOrThrow(createSubJobSchema, {
      job_id: UUID,
      than: "8",
      weight: "1",
      stages: ["Sarin", "Dropping"],
      sequence_no: 99,
    });
    expect(parsed.stages).toEqual(["Sarin", "Dropping"]);
    expect(parsed.current_stage).toBe("Sarin");
    expect(parsed).not.toHaveProperty("sequence_no");
  });

  it("records work without accepting client commission or earning", () => {
    const parsed = parseOrThrow(addEmployeeWorkSchema, {
      sub_job_id: UUID,
      employee_id: UUID,
      done_than: "5",
      commission: "99",
      earning: "495",
    });
    expect(parsed).not.toHaveProperty("commission");
    expect(parsed).not.toHaveProperty("earning");
  });

  it("validates subjob update schema with stages and current_stage", () => {
    const parsed = parseOrThrow(updateSubJobSchema, {
      id: UUID,
      than: "12",
      weight: "2.500",
      stages: ["Sarin", "Galaxy"],
      current_stage: "Galaxy",
      status: "Progress",
    });
    expect(parsed.id).toBe(UUID);
    expect(parsed.stages).toEqual(["Sarin", "Galaxy"]);
    expect(parsed.current_stage).toBe("Galaxy");
    expect(parsed.status).toBe("Progress");
  });

  it("validates subjob stage advance input", () => {
    const parsed = parseOrThrow(advanceSubJobStageSchema, {
      sub_job_id: UUID,
    });
    expect(parsed.sub_job_id).toBe(UUID);
  });
});

describe("jobs service security", () => {
  const service = readFileSync(path.join(process.cwd(), "src/services/jobs/jobs-service.ts"), "utf8");
  const actions = readFileSync(path.join(process.cwd(), "src/app/actions/jobs.ts"), "utf8");
  const createForm = readFileSync(
    path.join(process.cwd(), "src/components/jobs/job-create-form.tsx"),
    "utf8",
  );
  const detail = readFileSync(path.join(process.cwd(), "src/components/jobs/job-detail-view.tsx"), "utf8");
  const editForm = readFileSync(path.join(process.cwd(), "src/components/jobs/job-edit-form.tsx"), "utf8");
  const editPage = path.join(process.cwd(), "src/app/(dashboard)/jobs/[jobId]/edit/page.tsx");
  const list = readFileSync(path.join(process.cwd(), "src/components/jobs/jobs-view.tsx"), "utf8");

  it("creates jobs and ignores client lot numbers", () => {
    expect(service).toMatch(/rpc\("create_job"/);
    expect(service).not.toMatch(/rpc\("create_job_with_invoice"/);
    expect(service).toMatch(/rpc\("update_job_with_invoice_recalc"/);
    expect(service).not.toMatch(/p_lot_number/);
    expect(createForm).not.toMatch(/name="lot_number"/);
    expect(createForm).toMatch(/label="Job Date"/);
    expect(createForm).toMatch(/name="job_date"/);
    expect(createForm).toMatch(/DatePicker/);
    expect(createForm).toMatch(/todayIso\(\)/);
    expect(createForm).toMatch(/className="ui-job-form-full"/);
  });

  it("uses remaining-than and stage workflow RPCs for sub-jobs and snapshots work on the server", () => {
    expect(service).toMatch(/rpc\("create_sub_job"/);
    expect(service).toMatch(/rpc\("update_sub_job"/);
    expect(service).toMatch(/rpc\("advance_sub_job_stage"/);
    expect(service).toMatch(/rpc\("add_employee_work"/);
    expect(service).toMatch(/rpc\("update_employee_work"/);
    expect(service).toMatch(/rpc\("delete_employee_work"/);
    expect(service).not.toMatch(/p_commission/);
    expect(service).not.toMatch(/p_earning/);
  });

  it("re-authorizes inside job actions", () => {
    expect(actions).toMatch(/parseOrThrow\(createJobSchema/);
    expect(actions).toMatch(/parseOrThrow\(updateJobSchema/);
    expect(actions).toMatch(/parseOrThrow\(createSubJobSchema/);
    expect(actions).toMatch(/parseOrThrow\(addEmployeeWorkSchema/);
    expect(actions).toMatch(/parseOrThrow\(advanceSubJobStageSchema/);
    expect(service.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("edits jobs without changing lot or party", () => {
    expect(existsSync(editPage)).toBe(true);
    expect(readFileSync(editPage, "utf8")).toMatch(/await requireActiveAdmin\(\)/);
    expect(editForm).toMatch(/updateJobAction/);
    expect(editForm).toMatch(/useUnsavedChanges/);
    expect(editForm).toMatch(/disabled readOnly/);
    expect(editForm).not.toMatch(/name="lot_number"/);
    expect(editForm).not.toMatch(/name="party_id"/);
    expect(editForm).toMatch(/label="Job Date"/);
    expect(editForm).toMatch(/name="job_date"/);
    expect(editForm).toMatch(/className="ui-job-form-full"/);
    expect(detail).toMatch(/JobEditForm/);
    expect(detail).toMatch(/setEditJobOpen\(true\)/);
    expect(list).toMatch(/JobCreateForm/);
    expect(list).toMatch(/JobEditForm/);
    expect(list).toMatch(/getJobAction/);
    expect(list).toMatch(/header: "Job Date"/);
  });

  it("nests expandable sub-jobs inside the main jobs table and sorts by lot number descending", () => {
    expect(service).toMatch(/from\("v_sub_jobs_display"\)/);
    expect(service).toMatch(/\.order\("lot_number",\s*\{\s*ascending:\s*false\s*\}\)/);
    expect(list).toMatch(/Show sub-jobs/);
    expect(list).toMatch(/is-nested/);
  });

  it("supports delete actions with confirmation dialogs for jobs and sub-jobs", () => {
    expect(actions).toMatch(/deleteJobAction/);
    expect(actions).toMatch(/deleteSubJobAction/);
    expect(service).toMatch(/export async function deleteJob/);
    expect(service).toMatch(/export async function deleteSubJob/);
    expect(list).toMatch(/deleteJobAction/);
    expect(list).toMatch(/deleteSubJobAction/);
    expect(list).toMatch(/Delete Job\?/);
    expect(list).toMatch(/Delete Sub-Job\?/);
    expect(detail).toMatch(/deleteJobAction/);
    expect(detail).toMatch(/deleteSubJobAction/);
  });

  it("displays sub-jobs in a standard DataTable and supports dedicated SubJobDetailDialog", () => {
    const subJobDialogFile = path.resolve(__dirname, "../../components/jobs/sub-job-detail-dialog.tsx");
    expect(existsSync(subJobDialogFile)).toBe(true);
    const subJobDialog = readFileSync(subJobDialogFile, "utf8");

    expect(subJobDialog).toMatch(/export function SubJobDetailDialog/);
    expect(subJobDialog).toMatch(/ui-subjob-kpi-grid/);
    expect(subJobDialog).toMatch(/Employee Work Log/);
    expect(subJobDialog).toMatch(/StatusBadge/);
    expect(subJobDialog).not.toMatch(/Stage Progression History/);
    expect(subJobDialog).not.toMatch(/Production Stage Pipeline/);

    // JobDetailView renders DataTable for sub-jobs and integrates SubJobDetailDialog
    expect(detail).toMatch(/DataTable<JobSubJobRecord>/);
    expect(detail).toMatch(/SubJobDetailDialog/);
    expect(detail).toMatch(/setViewSub/);

    // JobsView provides sub-job row click to view and supports editing/deleting subjobs & work
    expect(list).toMatch(/SubJobDetailDialog/);
    expect(list).toMatch(/openSubDetail/);
    expect(list).toMatch(/openEditSub/);
    expect(list).toMatch(/updateSubJobAction/);
    expect(list).toMatch(/updateEmployeeWorkAction/);
    expect(list).toMatch(/deleteEmployeeWorkAction/);
  });
});
