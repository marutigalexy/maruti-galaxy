import { expect, test } from "@playwright/test";

import { createFromDialog, e2eAdmin, chooseOption, selectOptionContaining, signIn } from "./helpers";

const admin = e2eAdmin();

test.describe("QA-001 critical path", () => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD against a live Supabase project.");

  test("login through logout matches Section 14", async ({ page }) => {
    test.setTimeout(180_000);
    if (!admin) {
      return;
    }

    const stamp = String(Date.now());
    const partyName = `E2E Party ${stamp}`;
    const employeeName = `E2E Employee ${stamp}`;
    const accountName = `E2E Cash ${stamp}`;
    const incomeCategory = `E2E Income ${stamp}`;
    const expenseCategory = `E2E Salary ${stamp}`;
    const mobile = `9${stamp.slice(-9)}`;

    await signIn(page, admin.email, admin.password);

    await page.goto("/parties");
    await createFromDialog(page, "Add Party", "Add Party", async () => {
      await page.getByLabel("Company Name").fill(partyName);
      await page.getByLabel("Mobile Number").fill(mobile);
      await page.getByLabel("Price").fill("100");
    });
    await expect(page.getByRole("cell", { name: partyName })).toBeVisible();

    await page.goto("/employees");
    await createFromDialog(page, "Add Employee", "Add Employee", async () => {
      await page.getByLabel("Name").fill(employeeName);
      await page.getByLabel("Mobile Number").fill(mobile);
      await page.getByLabel("Commission").fill("10");
    });
    await expect(page.getByRole("cell", { name: employeeName })).toBeVisible();

    await page.goto("/accounting/accounts");
    await createFromDialog(page, "Add Account", "Add Account", async () => {
      await page.getByLabel("Account Name").fill(accountName);
      await page.getByLabel("Opening Balance").fill("0");
    });
    await expect(page.getByRole("cell", { name: accountName })).toBeVisible();

    await page.goto("/accounting/categories");
    await createFromDialog(page, "Add Category", "Add Category", async () => {
      await page.getByLabel("Category Name").fill(incomeCategory);
      await chooseOption(page, "Type", "Income");
    });
    await expect(page.getByRole("cell", { name: incomeCategory })).toBeVisible();
    await createFromDialog(page, "Add Category", "Add Category", async () => {
      await page.getByLabel("Category Name").fill(expenseCategory);
      await chooseOption(page, "Type", "Expense");
    });
    await expect(page.getByRole("cell", { name: expenseCategory })).toBeVisible();

    await page.goto("/jobs");
    await page.getByRole("button", { name: "Add Job" }).click();
    const jobDialog = page.getByRole("dialog", { name: "Add Job" });
    await expect(jobDialog).toBeVisible();
    await chooseOption(jobDialog, "Party", { label: partyName });
    await jobDialog.getByLabel("Than").fill("10");
    await jobDialog.getByLabel("Price").fill("100");
    await jobDialog.getByLabel("Kapan Number").fill(`E2E-${stamp}`);
    await jobDialog.getByLabel("Weight").fill("1.000");
    await jobDialog.getByRole("button", { name: "Create Job" }).click();
    await page.waitForURL(/\/jobs\/[0-9a-f-]{36}/i);
    const jobUrl = page.url();
    const lot = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    expect(lot).toMatch(/^J\d+$/);
    await expect(page.getByText(/INV-\d+/)).toBeVisible();
    await expect(page.getByText("₹1,000.00").first()).toBeVisible();

    await page.getByRole("button", { name: "Add Sub Job" }).click();
    await page.getByLabel("Than").fill("10");
    await page.getByLabel("Weight").fill("1.000");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: `${lot}-A` })).toBeVisible();

    await page.getByRole("button", { name: "Add Work" }).click();
    await chooseOption(page, "Employee", { label: employeeName });
    await page.getByLabel("Done Than").fill("10");
    await page.getByRole("dialog").getByRole("button", { name: "Add Work" }).click();
    await expect(page.getByText("Completed").first()).toBeVisible();

    await page.goto("/accounting/entries");
    await page.getByRole("button", { name: "Add Entry" }).click();
    const incomeDialog = page.getByRole("dialog", { name: "Add New Entry" });
    await expect(incomeDialog).toBeVisible();
    await incomeDialog.getByRole("radio", { name: "Income" }).click();
    await chooseOption(incomeDialog, "Payment Account", { label: accountName });
    await selectOptionContaining(incomeDialog, "Income Category", incomeCategory);
    await incomeDialog.getByLabel("Amount").fill("1000");
    await incomeDialog.getByRole("button", { name: "Save Entry" }).click();
    await expect(incomeDialog).toHaveCount(0);
    await page.getByRole("button", { name: "Allocate entry" }).first().click();
    const allocateDialog = page.getByRole("dialog", { name: "Allocate Income" });
    await expect(allocateDialog).toBeVisible();
    await expect(allocateDialog.locator("option").filter({ hasText: lot })).not.toHaveCount(0);
    await selectOptionContaining(allocateDialog, "Invoice", lot);
    await allocateDialog.getByLabel("Allocation Amount").fill("1000");
    await allocateDialog.getByRole("button", { name: "Allocate" }).click();
    await expect(allocateDialog).toHaveCount(0);

    await page.getByRole("button", { name: "Add Entry" }).click();
    const expenseDialog = page.getByRole("dialog", { name: "Add New Entry" });
    await expect(expenseDialog).toBeVisible();
    await expenseDialog.getByRole("radio", { name: "Expense" }).click();
    await chooseOption(expenseDialog, "Payment Account", { label: accountName });
    await selectOptionContaining(expenseDialog, "Expense Category", expenseCategory);
    await expenseDialog.getByLabel("Amount").fill("50");
    await expenseDialog.getByRole("button", { name: "Save Entry" }).click();
    await expect(expenseDialog).toHaveCount(0);

    await page.goto(jobUrl);
    await expect(page.getByText("Paid").first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Total Jobs")).toBeVisible();
    await expect(page.getByText("Outstanding Amount")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Jobs" })).toBeVisible();
    await expect(page.getByText(lot)).toBeVisible();

    await page.goto("/reports/outstanding");
    await expect(page.getByRole("heading", { name: "Outstanding Reports" })).toBeVisible();

    await page.goto("/reports/profit-loss");
    await expect(page.getByRole("heading", { name: "Profit & Loss" })).toBeVisible();
    await expect(page.getByText("Total Income")).toBeVisible();
    await expect(page.getByText("Total Expense")).toBeVisible();

    await page.locator(".app-sidebar-profile").click();
    await page.getByRole("button", { name: "Log out" }).click();
    const logoutDialog = page.getByRole("dialog", { name: "Confirm Logout" });
    await logoutDialog.waitFor();
    await logoutDialog.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(/\/auth\/login/);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});
