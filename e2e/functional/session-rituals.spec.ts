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

test.describe("rito della giornata e sessione", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("la creatura ha sonno, si lava i denti con te e poi si sveglia", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 27, 7, 30) });
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("companion-story").click();
    await page.getByTestId("companion-song").click();
    await expect(page.getByTestId("companion-story").locator("input")).toBeChecked();
    await page.goto("/habitat");
    await expect(page.getByTestId("creature-sleepy")).toBeVisible();
    await page.goto("/");
    await page.getByTestId("manual-start-stop").click();
    await page.clock.runFor(1_500);
    await expect(page.getByTestId("session-stains")).toBeVisible();
    await expect(page.getByTestId("stains-zone-3")).toContainText("🦠🦠🦠");
    await page.clock.runFor(6_000);
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();
    await page.goto("/settings");
    await expect(page.getByTestId("companion-settings")).toContainText("2 di 14");
    await page.goto("/habitat");
    await expect(page.getByTestId("creature-sleepy")).toHaveCount(0);
  });

  test("routine della buonanotte: il collutorio solo dai 7 anni", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("age-group-3to6").click();
    await expect(page.getByTestId("bedtime-setting-mouthwash").locator("input")).toBeDisabled();
    await page.getByTestId("bedtime-setting-floss").click();
    await page.getByTestId("bedtime-setting-pajamas").click();
    await page.goto("/missions");
    await page.getByTestId("bedtime-floss").click();
    await expect(page.getByTestId("bedtime-floss")).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.getByTestId("bedtime-floss")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("bedtime-mouthwash")).toHaveCount(0);
  });

  test("modalità vacanza: la Home lo dice e il manico resta fuori", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 27, 10, 0));
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("holiday-until").fill("2026-10-20");
    await page.getByTestId("holiday-start").click();
    await expect(page.getByTestId("holiday-error")).toBeVisible();
    await page.getByTestId("holiday-until").fill("2026-11-03");
    await page.getByTestId("holiday-start").click();
    await expect(page.getByTestId("holiday-active")).toContainText("3 novembre");
    await page.goto("/");
    await expect(page.getByTestId("home-holiday")).toBeVisible();
    await page.goto("/device");
    await expect(page.getByTestId("device-holiday")).toBeVisible();
    await page.goto("/settings");
    await page.getByTestId("holiday-stop").click();
    await page.goto("/");
    await expect(page.getByTestId("home-holiday")).toHaveCount(0);
  });
});
