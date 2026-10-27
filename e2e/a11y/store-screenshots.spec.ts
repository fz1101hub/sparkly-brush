import { expect, test, type Page } from "@playwright/test";

/**
 * Store screenshots (voce 53): the same screens the CI already checks, in the five languages
 * with complete content, saved in artifacts/playwright/store/ and uploaded with the CI artifacts.
 */
const LANGUAGES = [
  { id: "it", label: "Italiano" },
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
] as const;

async function completeFirstRun(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) await page.getByTestId("onboarding-next").click();
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test.describe("screenshot per gli store", () => {
  for (const language of LANGUAGES) {
    test(`schermate principali in ${language.id}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(2026, 9, 27, 8, 0));
      await completeFirstRun(page);
      await page.goto("/settings");
      await page.getByRole("radio", { name: language.label }).click();
      await page.goto("/");
      await expect(page.getByTestId("today-screen")).toBeVisible();
      await page.screenshot({ path: `artifacts/playwright/store/${language.id}-1-today.png` });
      await page.goto("/album");
      await expect(page.getByTestId("album-screen")).toBeVisible();
      await page.screenshot({ path: `artifacts/playwright/store/${language.id}-2-album.png` });
      await page.goto("/missions");
      await expect(page.getByTestId("weekly-challenge")).toBeVisible();
      await page.screenshot({ path: `artifacts/playwright/store/${language.id}-3-missions.png` });
      await page.goto("/collection");
      await page.screenshot({ path: `artifacts/playwright/store/${language.id}-4-world.png` });
    });
  }
});
