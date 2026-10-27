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

test.describe("piattaforma", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("portoghese, olandese e polacco nel selettore della lingua", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByRole("radio", { name: "Português" }).click();
    await expect(page.getByTestId("language-content-note")).toContainText("inglês");
    await page.getByRole("radio", { name: "Polski" }).click();
    await expect(page.getByTestId("language-content-note")).toContainText("angielsku");
    await page.getByRole("radio", { name: "Italiano" }).click();
    await expect(page.getByTestId("language-content-note")).toHaveCount(0);
  });

  test("sparklybrush://start avvia il timer guidato", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/start");
    await expect(page.getByTestId("session-stains")).toBeVisible({ timeout: 10_000 });
  });

  test("su tablet i contenuti restano in una colonna centrata", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await completeFirstRun(page);
    await page.goto("/settings");
    const box = await page.getByTestId("inclusion-settings").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(720);
    expect(box!.x).toBeGreaterThan(100);
  });
});
