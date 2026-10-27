import { expect, test, type Page } from "@playwright/test";

async function completeFirstRun(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    await page.getByTestId("onboarding-next").click();
  }
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test.describe("routine: serie, nomi e impostazioni del genitore", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("il bambino dà un nome alla creatura e resta dopo il ricaricamento", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/habitat");
    await page.getByTestId("creature-name-edit").click();
    await page.getByTestId("creature-name-input").fill("  Blu <3 ");
    await page.getByTestId("creature-name-save").click();
    await expect(page.getByTestId("habitat-creature-name")).toHaveText("Blu 3");
    await page.reload();
    await expect(page.getByTestId("habitat-creature-name")).toHaveText("Blu 3");
  });

  test("la serie del sorriso conta le spazzolate e i giorni senza telefono segnati dal genitore", async ({ page }) => {
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();
    await page.goto("/collection");
    await expect(page.getByTestId("smile-streak")).toHaveText("1");

    await page.goto("/parent");
    // Chips are named after the day key (YYYY-MM-DD): the second one is yesterday.
    const yesterday = page.locator('[data-testid^="streak-day-2"]').nth(1);
    await yesterday.click();
    await expect(yesterday).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("streak-reason-offline").click();
    await page.getByTestId("streak-day-save").click();
    await expect(page.locator('[data-testid^="streak-marked-"]')).toHaveCount(1);

    await page.goto("/collection");
    await expect(page.getByTestId("smile-streak")).toHaveText("2");
  });

  test("il genitore sceglie la durata della spazzolata con il timer", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    const oneMinute = page.getByTestId("session-length-60");
    await oneMinute.click();
    await expect(oneMinute).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.getByTestId("session-length-60")).toHaveAttribute("aria-checked", "true");
  });
});
