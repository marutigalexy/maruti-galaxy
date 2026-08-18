import { expect, test } from "@playwright/test";

import { e2eAdmin, signIn } from "./helpers";

const admin = e2eAdmin();

test.describe("QA-002 responsive screens", () => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD against a live Supabase project.");

  test("mobile opens the navigation drawer without shrinking tables to unreadability", async ({
    page,
  }) => {
    if (!admin) {
      return;
    }
    await signIn(page, admin.email, admin.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/jobs");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("complementary", { name: "Primary" })).toBeVisible();
    await page.getByRole("link", { name: "Parties" }).click();
    await expect(page.getByRole("heading", { name: "Parties" })).toBeVisible();
    await expect(page.locator(".ui-table-wrap")).toBeVisible();
  });

  test("tablet keeps compact navigation and filter wrapping", async ({ page }) => {
    if (!admin) {
      return;
    }
    await signIn(page, admin.email, admin.password);
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/jobs");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await expect(page.getByRole("search", { name: "Filters" })).toBeVisible();
  });
});
