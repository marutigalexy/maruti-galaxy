import { expect, type Locator, type Page } from "@playwright/test";

export function e2eAdmin(): { email: string; password: string } | null {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || "";
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!email || !password || email === "admin@example.com" || password === "change-me") {
    return null;
  }
  return { email, password };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function chooseOption(
  root: Page | Locator,
  label: string,
  option: string | { label: string },
) {
  const name = typeof option === "string" ? option : option.label;
  await root.getByLabel(label).click();
  const page = "goto" in root ? root : root.page();
  await page.getByRole("option", { name, exact: true }).click();
}

export async function selectOptionContaining(
  root: Page | Locator,
  label: string,
  text: string,
) {
  await root.getByLabel(label).click();
  const page = "goto" in root ? root : root.page();
  const option = page.getByRole("option").filter({ hasText: text }).first();
  await expect(option).toBeVisible();
  await option.click();
}

export async function createFromDialog(
  page: Page,
  openName: string,
  dialogTitle: string,
  fill: () => Promise<void>,
) {
  await page.getByRole("button", { name: openName }).click();
  await expect(page.getByRole("heading", { name: dialogTitle })).toBeVisible();
  await fill();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: dialogTitle })).toHaveCount(0);
}
