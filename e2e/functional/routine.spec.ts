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

  test("dopo la spazzolata: consigli, passo extra, curiosità; durante: superfici e spazzoliamo insieme", async ({ page }) => {
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await expect(page.getByTestId("session-surface")).toBeVisible();
    await page.getByTestId("brush-together").click();
    await expect(page.getByTestId("brush-together")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("after-brush")).toContainText("non sciacquare");
    await expect(page.getByTestId("did-you-know")).toBeVisible();
    await page.getByTestId("extra-step-done").click();
    await expect(page.getByTestId("extra-step-recorded")).toBeVisible();
    await page.getByTestId("session-reward-dismiss").click();
    await expect(page.getByTestId("home-extra-step")).toBeVisible();
  });

  test("la sera, dopo la ricompensa, la creatura dà la buonanotte", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 27, 20, 15) });
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await page.clock.runFor(7_000);
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();
    await expect(page.getByTestId("goodnight-overlay")).toBeVisible();
    await page.getByTestId("goodnight-close").click();
    await expect(page.getByTestId("goodnight-overlay")).toHaveCount(0);
  });

  test("visita dal dentista con conto alla rovescia e guida per la babysitter", async ({ page }) => {
    await completeFirstRun(page);
    const visit = new Date();
    visit.setDate(visit.getDate() + 5);
    const day = `${visit.getFullYear()}-${String(visit.getMonth() + 1).padStart(2, "0")}-${String(visit.getDate()).padStart(2, "0")}`;
    await page.goto("/parent");
    await page.getByTestId("dentist-date").fill("2020-01-01");
    await page.getByTestId("dentist-save").click();
    await expect(page.getByText("Scrivi una data di oggi o futura", { exact: false })).toBeVisible();
    await page.getByTestId("dentist-date").fill(day);
    await page.getByTestId("dentist-save").click();
    await expect(page.getByTestId("dentist-saved")).toBeVisible();
    await page.getByTestId("babysitter-note-input").fill("Il peluche blu dorme con lei");
    await page.getByTestId("babysitter-note-save").click();

    await page.goto("/");
    await expect(page.getByTestId("home-dentist")).toContainText("tra 5 giorni");
    await page.getByTestId("home-dentist").click();
    await expect(page.getByTestId("visit-next").or(page.getByTestId("visit-done"))).toBeVisible();

    await page.goto("/babysitter");
    await expect(page.getByTestId("babysitter-note")).toHaveText("Il peluche blu dorme con lei");
    await expect(page.getByTestId("babysitter-guide")).toContainText("2 minuti");
  });

  test("cancellare tutti i dati riporta l'app al primo avvio", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/habitat");
    await page.getByTestId("creature-name-edit").click();
    await page.getByTestId("creature-name-input").fill("Blu");
    await page.getByTestId("creature-name-save").click();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.goto("/settings");
    await page.getByTestId("family-wipe-button").click();
    await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  });
});
