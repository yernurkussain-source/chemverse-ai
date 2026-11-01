import { expect, test } from "@playwright/test";

test("Оқу: 26 тараудың конспектісі ашылады", async ({ page }) => {
  await page.goto("/kk/learn");
  // Тарау сілтемелері ғана (формулалар карточкасы да /learn/ ішінде)
  await expect(page.locator('main a[href*="/learn/"]:not([href$="/formulas"])')).toHaveCount(26);
  await page.goto("/kk/learn/9-04-chemical-equilibrium");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Химиялық тепе-теңдік");
  await expect(page.getByRole("heading", { name: /Ле Шателье принципі/ })).toBeVisible();
});

test("Оқу: формулалар анықтамасында 23 формула", async ({ page }) => {
  await page.goto("/kk/learn/formulas");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Формулалар анықтамасы");
  await expect(page.locator("section h3")).toHaveCount(23);
});
