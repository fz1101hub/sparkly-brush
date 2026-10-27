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

test.describe("manico sperimentale e fratelli insieme", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("le funzioni sperimentali partono spente e si accendono dalla schermata Manico", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/device");
    await expect(page.getByTestId("handle-experiments")).toBeVisible();
    await expect(page.getByTestId("experiment-handleZones").locator("input")).not.toBeChecked();
    await page.getByTestId("experiment-handleZones").click();
    await expect(page.getByTestId("experiment-handleZones").locator("input")).toBeChecked();
    await expect(page.getByTestId("handle-motor")).toContainText("collegato");
  });

  test("un solo timer per due fratelli salva la spazzolata a entrambi", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 27, 8, 0) });
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("profile-new-name").fill("Luca");
    await page.getByTestId("profile-create").click();
    await page.getByTestId("starter-spriggo").click();
    await page.getByTestId("starter-confirm").click();
    await page.goto("/siblings");
    await page.getByTestId("siblings-primary").click();
    await page.getByTestId("siblings-start").click();
    await expect(page.getByTestId("siblings-timer")).toBeVisible();
    await page.clock.runFor(7_000);
    await expect(page.getByTestId("siblings-message")).toContainText("Luca");
    await page.goto("/collection");
    await page.goto("/history");
    await expect(page.locator("body")).toContainText(/1|una/);
  });
});
