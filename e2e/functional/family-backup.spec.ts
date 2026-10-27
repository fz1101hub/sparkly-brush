import { expect, test } from "@playwright/test";

test("sul web il backup di famiglia rimanda all'app iOS e Android", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) await page.getByTestId("onboarding-next").click();
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await page.goto("/backup");
  await expect(page.getByTestId("family-backup")).toContainText("iOS e Android");
  await expect(page.getByTestId("family-backup-export")).toBeDisabled();
  await expect(page.getByTestId("family-backup-auto").locator("input")).toBeDisabled();
});
