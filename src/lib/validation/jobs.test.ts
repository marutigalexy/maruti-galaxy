import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseOrThrow } from "@/lib/validation";
import {
  addEmployeeWorkSchema,
  createJobSchema,
  createSubJobSchema,
  listJobsSchema,
  updateJobSchema,
} from "@/lib/validation/jobs";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("job schemas", () => {
  it("requires party, type, than, price, kapan, and decimal weight", () => {
    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        job_type: "Sarin",
        than: "10",
        price: "1",
        kapan_number: "",
        weight: "1.5",
      }),
    ).toThrow(/Kapan Number is required/);

    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        job_type: "Sarin",
        than: "0",
        price: "1",
        kapan_number: "K1",
        weight: "1.5",
      }),
    ).toThrow(/out of range/i);

    expect(() =>
      parseOrThrow(createJobSchema, {
        party_id: UUID,
        job_type: "Sarin",
        than: "10",
        price: "-1",
        kapan_number: "K1",
        weight: "1.5",
      }),
    ).toThrow(/out of range|decimal/i);
  });

  it("defaults status to Pending and strips client lot/invoice fields", () => {
    const parsed = parseOrThrow(createJobSchema, {
      party_id: UUID,
      job_type: "Galaxy",
      than: "10.500",
      price: "12.50",
      kapan_number: " KAPAN-1 ",
      weight: "0.125",
      lot_number: "J99",
      invoice_number: "INV-0009",
      amount: "999",
    });

    expect(parsed.status).toBe("Pending");
    expect(parsed.kapan_number).toBe("KAPAN-1");
    expect(parsed).not.toHaveProperty("lot_number");
    expect(parsed).not.toHaveProperty("invoice_number");
    expect(parsed).not.toHaveProperty("amount");
  });

  it("accepts status picker values and rejects unknown statuses", () => {
    expect(
      parseOrThrow(updateJobSchema, {
        id: UUID,
        job_type: "Dropping",
        than: "1",
        price: "1",
        kapan_number: "K1",
        weight: "0",
        status: "Completed",
      }).status,
    ).toBe("Completed");

    expect(() =>
      parseOrThrow(updateJobSchema, {
        id: UUID,
        job_type: "Sarin",
        than: "1",
        price: "1",
        kapan_number: "K1",
        weight: "0",
        status: "Cancelled",
      }),
    ).toThrow();
  });

  it("parses job list filters including J01-A search", () => {
    expect(parseOrThrow(listJobsSchema, { search: "J01-A", job_type: "Sarin" })).toMatchObject({
      search: "J01-A",
      job_type: "Sarin",
      status: "all",
      page: 1,
      pageSize: 30,
    });
    expect(() => parseOrThrow(listJobsSchema, { pageSize: 1000 })).toThrow();
  });

  it("requires sub-job than and ignores client sequence", () => {
    const parsed = parseOrThrow(createSubJobSchema, {
      job_id: UUID,
      than: "8",
      weight: "1",
      sequence_no: 99,
    });
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

  it("creates jobs through the atomic invoice RPC and ignores client lot numbers", () => {
    expect(service).toMatch(/rpc\("create_job_with_invoice"/);
    expect(service).toMatch(/rpc\("update_job_with_invoice_recalc"/);
    expect(service).not.toMatch(/p_lot_number/);
    expect(createForm).toMatch(/Assigned on save/);
    expect(createForm).not.toMatch(/name="lot_number"/);
  });

  it("uses remaining-than RPCs for sub-jobs and snapshots work on the server", () => {
    expect(service).toMatch(/rpc\("create_sub_job"/);
    expect(service).toMatch(/rpc\("update_sub_job"/);
    expect(service).toMatch(/rpc\("add_employee_work"/);
    expect(service).toMatch(/rpc\("update_employee_work"/);
    expect(service).toMatch(/rpc\("delete_employee_work"/);
    expect(service).not.toMatch(/p_commission/);
    expect(service).not.toMatch(/p_earning/);
    expect(detail).toMatch(/server stores the snapshot/);
  });

  it("re-authorizes inside job actions", () => {
    expect(actions).toMatch(/parseOrThrow\(createJobSchema/);
    expect(actions).toMatch(/parseOrThrow\(updateJobSchema/);
    expect(actions).toMatch(/parseOrThrow\(addEmployeeWorkSchema/);
    expect(service.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("edits jobs on /jobs/[jobId]/edit without changing lot or party", () => {
    expect(existsSync(editPage)).toBe(true);
    expect(readFileSync(editPage, "utf8")).toMatch(/await requireActiveAdmin\(\)/);
    expect(editForm).toMatch(/updateJobAction/);
    expect(editForm).toMatch(/useUnsavedChanges/);
    expect(editForm).toMatch(/disabled readOnly/);
    expect(editForm).not.toMatch(/name="lot_number"/);
    expect(editForm).not.toMatch(/name="party_id"/);
    expect(editForm).toMatch(/saved amount comes from the server/);
    expect(detail).toMatch(/JobEditForm/);
    expect(detail).toMatch(/setEditJobOpen\(true\)/);
    expect(list).toMatch(/JobCreateForm/);
    expect(list).toMatch(/JobEditForm/);
    expect(list).toMatch(/getJobAction/);
    expect(detail).not.toMatch(/\/jobs\/\$\{job\.id\}\/edit/);
    expect(list).not.toMatch(/\/jobs\/\$\{row\.id\}\/edit/);
  });

  it("nests expandable sub-jobs inside the main jobs table", () => {
    expect(service).toMatch(/from\("v_sub_jobs_display"\)/);
    expect(list).toMatch(/Show sub-jobs/);
    expect(list).toMatch(/is-nested/);
  });
});
