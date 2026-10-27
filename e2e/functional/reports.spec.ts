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

test.describe("stampe, rapporti e libretto dentale", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("rapporto per il dentista: stampa, CSV e codice dello studio", async ({ page, context }) => {
    await page.clock.install({ time: new Date(2026, 9, 27, 8, 15) });
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await page.clock.runFor(7_000);
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();

    await page.goto("/parent");
    await page.getByTestId("family-nav-reports").click();
    await expect(page.getByTestId("reports-screen")).toBeVisible();
    await expect(page.getByTestId("weekly-summary-count")).toContainText("1 spazzolate su 14");
    await expect(page.getByTestId("month-2026-10")).toBeVisible();
    await expect(page.getByTestId("report-summary")).toContainText("1 spazzolate complete");

    await page.getByTestId("clinic-name").fill("Studio Più Sorrisi");
    await page.getByTestId("clinic-phone").fill("02 123");
    await page.getByTestId("clinic-save").click();
    await expect(page.getByTestId("clinic-code")).toContainText("SB1-");
    const code = (await page.getByTestId("clinic-code").innerText()).split(": ").pop()!.trim();

    const popup = context.waitForEvent("page");
    await page.getByTestId("report-print").click();
    const sheet = await popup;
    await expect(sheet.locator("body")).toContainText("Studio Più Sorrisi");
    await expect(sheet.locator("body")).toContainText("Spazzolate complete");
    await sheet.close();

    const download = page.waitForEvent("download");
    await page.getByTestId("report-csv").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^spazzolate-2026-10-27\.csv$/);

    await page.getByTestId("clinic-code-input").fill("SB1-sbagliato.0000");
    await page.getByTestId("clinic-code-apply").click();
    await expect(page.getByTestId("clinic-message")).toContainText("non valido");
    await page.getByTestId("clinic-name").fill("");
    await page.getByTestId("clinic-code-input").fill(code);
    await page.getByTestId("clinic-code-apply").click();
    await expect(page.getByTestId("clinic-message")).toContainText("Studio Più Sorrisi");
    await expect(page.getByTestId("clinic-name")).toHaveValue("Studio Più Sorrisi");

    await expect(page.getByTestId("certificate-days30")).toBeDisabled();
    const board = context.waitForEvent("page");
    await page.getByTestId("board-print").click();
    await expect((await board).locator("td.box")).toHaveCount(14);
  });

  test("libretto dentale: aggiungere e togliere una sigillatura", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/parent");
    await page.getByTestId("family-nav-booklet").click();
    await expect(page.getByTestId("booklet-empty")).toBeVisible();
    await page.getByTestId("booklet-kind-sealant").click();
    await page.getByTestId("booklet-day").fill("2099-01-01");
    await page.getByTestId("booklet-save").click();
    await expect(page.getByTestId("booklet-error")).toBeVisible();
    await page.getByTestId("booklet-day").fill("2026-10-01");
    await page.getByTestId("booklet-note").fill("Molari 36 e 46");
    await page.getByTestId("booklet-save").click();
    await expect(page.locator('[data-testid^="booklet-record-"]')).toContainText("Molari 36 e 46");
    await page.reload();
    await expect(page.locator('[data-testid^="booklet-record-"]')).toContainText("Sigillatura");
    await page.getByTestId("booklet-remove").click();
    await expect(page.getByTestId("booklet-empty")).toBeVisible();
  });
});
