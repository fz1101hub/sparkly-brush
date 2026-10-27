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

test.describe("motivazione nel tempo", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("prima settimana guidata e stagione di Halloween sulla Home", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 27, 10, 0));
    await completeFirstRun(page);
    await expect(page.getByTestId("home-discovery")).toContainText("creatura");
    await expect(page.getByTestId("home-season")).toContainText("Halloween");
    await page.getByTestId("home-season").click();
    await expect(page.getByTestId("album-screen")).toBeVisible();
    await expect(page.getByTestId("album-season")).toContainText("Halloween");
    await page.goto("/");
    await page.getByTestId("home-discovery").click();
    await expect(page.getByTestId("habitat-creature-name")).toBeVisible();
  });

  test("la domenica di Halloween una spazzolata riempie tre figurine, la sfida e il boss", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 25, 8, 15) });
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await page.clock.runFor(7_000);
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();

    await page.goto("/album");
    await expect(page.getByTestId("album-count")).toContainText("3 di 55");
    await expect(page.getByTestId("sticker-sea-whale")).toHaveAttribute("aria-label", "Balena");
    await expect(page.getByTestId("sticker-rare-unicorn")).toHaveAttribute("aria-label", "Unicorno d’oro");
    await expect(page.getByTestId("sticker-season-pumpkin")).toHaveAttribute("aria-label", "Zucca di Halloween");
    await expect(page.getByTestId("sticker-garden-sunflower")).toHaveAttribute("aria-label", "Figurina da trovare");

    await page.goto("/missions");
    await expect(page.getByTestId("weekly-challenge-progress")).toBeVisible();
    await expect(page.getByTestId("family-boss-hp")).toContainText("Forza rimasta");
    await expect(page.getByTestId("milestone-30")).toBeVisible();
  });

  test("il bambino propone un obiettivo e il genitore lo approva", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/missions");
    await page.getByTestId("child-goal-park").click();
    await page.getByTestId("child-goal-days-3").click();
    await page.getByTestId("child-goal-propose").click();
    await expect(page.getByTestId("child-goal-pending")).toContainText("parco");

    await page.goto("/parent");
    await expect(page.getByTestId("goal-approval")).toContainText("3 giorni");
    await page.getByTestId("goal-approve").click();
    await expect(page.getByTestId("goal-approval")).toHaveCount(0);
    await expect(page.getByText("Un pomeriggio al parco").first()).toBeVisible();

    await page.goto("/missions");
    await expect(page.getByTestId("child-goal-propose")).toBeVisible();
  });

  test("dai 7 anni le statistiche, per i piccoli il pulsante ascolta", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/missions");
    await expect(page.getByTestId("my-stats")).toHaveCount(0);
    await page.goto("/settings");
    await page.getByTestId("age-group-over6").click();
    await page.goto("/missions");
    await expect(page.getByTestId("my-stats")).toBeVisible();
    await page.goto("/settings");
    await page.getByTestId("age-group-3to6").click();
    await page.goto("/missions");
    await expect(page.getByTestId("my-stats")).toHaveCount(0);
    await expect(page.getByTestId("weekly-challenge").getByRole("button", { name: /Ascolta/ })).toBeVisible();
  });
});
