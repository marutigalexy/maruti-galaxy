import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("modal form state reset behavior", () => {
  const dialogSrc = readFileSync(
    path.join(process.cwd(), "src/components/ui/dialog.tsx"),
    "utf8",
  );
  const employeesViewSrc = readFileSync(
    path.join(process.cwd(), "src/components/employees/employees-view.tsx"),
    "utf8",
  );
  const employeeDetailViewSrc = readFileSync(
    path.join(process.cwd(), "src/components/employees/employee-detail-view.tsx"),
    "utf8",
  );
  const jobsViewSrc = readFileSync(
    path.join(process.cwd(), "src/components/jobs/jobs-view.tsx"),
    "utf8",
  );
  const jobDetailViewSrc = readFileSync(
    path.join(process.cwd(), "src/components/jobs/job-detail-view.tsx"),
    "utf8",
  );

  it("Dialog conditionally mounts children and footer only when open is true", () => {
    expect(dialogSrc).toMatch(/\{open \? children : null\}/);
    expect(dialogSrc).toMatch(/\{open \? \(/);
  });

  it("EmployeesView resets create form state on open and close, while preserving edit state", () => {
    // Create form helpers
    expect(employeesViewSrc).toMatch(/function handleOpenCreate\(\)/);
    expect(employeesViewSrc).toMatch(/function handleCloseCreate\(\)/);
    expect(employeesViewSrc).toMatch(/key="create-employee-form"/);

    // Edit form helpers
    expect(employeesViewSrc).toMatch(/function handleOpenEdit\(/);
    expect(employeesViewSrc).toMatch(/function handleCloseEdit\(\)/);
    expect(employeesViewSrc).toMatch(/key=\{`edit-employee-\$\{editEmployee\.id\}`\}/);
    expect(employeesViewSrc).toMatch(/defaultValue=\{editEmployee\.name\}/);
  });

  it("EmployeeDetailView conditionally mounts edit form and handles open/close", () => {
    expect(employeeDetailViewSrc).toMatch(/function handleOpenEdit\(\)/);
    expect(employeeDetailViewSrc).toMatch(/function handleCloseEdit\(\)/);
    expect(employeeDetailViewSrc).toMatch(/key=\{`edit-employee-\$\{employee\.id\}`\}/);
    expect(employeeDetailViewSrc).toMatch(/defaultValue=\{employee\.name\}/);
  });

  it("JobsView resets work form state on open and close, while preserving edit work", () => {
    // Add work helpers
    expect(jobsViewSrc).toMatch(/function openAddWork\(sub: JobSubJobRecord\)/);
    expect(jobsViewSrc).toMatch(/setWorkEmployeeId\(""\)/);
    expect(jobsViewSrc).toMatch(/setWorkDoneThan\(""\)/);
    expect(jobsViewSrc).toMatch(/function closeAddWork\(\)/);

    // Edit work helpers
    expect(jobsViewSrc).toMatch(/function openEditWork\(work: JobWorkRecord\)/);
    expect(jobsViewSrc).toMatch(/function closeEditWork\(\)/);

    // Work modal keys
    expect(jobsViewSrc).toMatch(/key=\{`work-create-\$\{workSub\.id\}-\$\{workSub\.current_stage\}`\}/);
    expect(jobsViewSrc).toMatch(/key=\{`work-edit-\$\{editWork\.id\}`\}/);

    // Mutation success resets
    expect(jobsViewSrc).toMatch(/closeAddWork\(\);/);
    expect(jobsViewSrc).toMatch(/closeEditWork\(\);/);
  });

  it("JobDetailView resets work form state on open and close, while preserving edit work", () => {
    // Add work helpers
    expect(jobDetailViewSrc).toMatch(/function handleOpenAddWork\(sub: JobSubJobRecord\)/);
    expect(jobDetailViewSrc).toMatch(/setWorkEmployeeId\(""\)/);
    expect(jobDetailViewSrc).toMatch(/setWorkDoneThan\(""\)/);
    expect(jobDetailViewSrc).toMatch(/function handleCloseAddWork\(\)/);

    // Edit work helpers
    expect(jobDetailViewSrc).toMatch(/function handleOpenEditWork\(work: JobWorkRecord\)/);
    expect(jobDetailViewSrc).toMatch(/function handleCloseEditWork\(\)/);

    // Work modal keys
    expect(jobDetailViewSrc).toMatch(/key=\{`work-create-\$\{workSub\.id\}-\$\{workSub\.current_stage\}`\}/);
    expect(jobDetailViewSrc).toMatch(/key=\{`work-edit-\$\{editWork\.id\}`\}/);
  });
});
