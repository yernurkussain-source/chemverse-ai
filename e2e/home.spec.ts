import { expect, test } from "@playwright/test";

test("басты бет қазақша ашылады", async ({ page }) => {
  await page.goto("/kk");
  await expect(page).toHaveTitle(/CHEMVERSE AI/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
