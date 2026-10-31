import { expect, test } from "@playwright/test";

test("Оқу: 26 тараудың конспектісі ашылады", async ({ page }) => {
  await page.goto("/kk/learn");
  await expect(page.locator('main a[href*="/learn/"]')).toHaveCount(26);
  await page.goto("/kk/learn/9-04-chemical-equilibrium");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Химиялық тепе-теңдік");
  await expect(page.getByRole("heading", { name: /Ле Шателье принципі/ })).toBeVisible();
});
