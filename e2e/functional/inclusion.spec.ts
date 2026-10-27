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

test.describe("inclusione", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("modalità tranquilla, carattere leggibile e alto contrasto", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("inclusion-calm").click();
    await page.getByTestId("inclusion-legible").click();
    await page.getByTestId("inclusion-contrast").click();
    await expect(page.getByTestId("inclusion-contrast").locator("input")).toBeChecked();
    const title = page.getByTestId("inclusion-settings").getByRole("heading").first();
    await expect(title).toHaveCSS("font-family", /BrushlingsLegible/);
    await expect(page.getByTestId("inclusion-settings")).toHaveCSS("background-color", /rgb\((255, 255, 255|0, 0, 0)\)/);
    await page.goto("/");
    await expect(page.getByTestId("calm-schedule")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("calm-schedule")).toBeVisible();
  });

  test("per chi non sa leggere la sessione mostra solo icone", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 27, 8, 15) });
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("inclusion-preReader").click();
    await page.goto("/");
    await page.getByTestId("manual-start-stop").click();
    await page.clock.runFor(1_500);
    await expect(page.getByTestId("session-surface")).toBeVisible();
    await expect(page.getByTestId("session-surface")).not.toContainText("Fuori");
    await expect(page.getByTestId("brush-together")).toHaveCount(0);
  });

  test("il bambino sceglie il suo personaggio accanto alla creatura", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/habitat");
    await page.getByTestId("avatar-face-girl").click();
    await page.getByTestId("avatar-tone-medium").click();
    await page.getByTestId("avatar-hat-crown").click();
    await expect(page.getByTestId("child-avatar-preview")).toContainText("👑👧🏽");
    await page.reload();
    await expect(page.getByTestId("child-avatar-preview")).toContainText("👑👧🏽");
  });
});
