import { expect, test, type Page } from "@playwright/test";
import { LAB_CATALOG } from "../src/features/virtual-lab/catalog";

/** Беттегі JS қателерін жинайды (консольдегі error және ұсталмаған қате) */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  return errors;
}

// ChemLab: әр тәжірибе ашылып, «Тәжірибені бастау» 2-қадамға өткізеді (href-тілері — бөлек беттер).
// npm run dev-те алғашқы компиляция кезінде Next кейде «Unexpected end of JSON input» береді — қайта іске қосу жеткілікті; production-да (CI) болмайды
for (const lab of LAB_CATALOG.filter((l) => !("href" in l))) {
  test(`ChemLab: ${lab.slug}`, async ({ page }) => {
    const errors = collectErrors(page);
    // networkidle: React бетті «тірілткенше» басылған батырма елеусіз қалады (әсіресе npm run dev-те)
    await page.goto(`/kk/virtual-lab/${lab.slug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Тәжірибені бастау" }).click();
    await expect(page.getByRole("navigation", { name: "2/8-қадам" })).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });
}

test("3D зертхана: canvas пайда болады", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/kk/game");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});
