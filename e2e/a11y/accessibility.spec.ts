import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, testInfo: TestInfo, name: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await mkdir("artifacts/playwright/axe", { recursive: true });
  await writeFile(`artifacts/playwright/axe/${name}.json`, JSON.stringify(results, null, 2));
  await testInfo.attach(`${name}-axe.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  if (results.violations.length > 0) {
    throw new Error(results.violations.map((violation) => (
      `${violation.id}: ${violation.description} (${violation.nodes.length})`
    )).join("\n"));
  }
}

async function completeFirstRun(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("starter-chooser")).toBeVisible();
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test.describe("WCAG automatic audit", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("onboarding", async ({ page }, testInfo) => {
    await page.goto("/");
    const onboarding = page.getByTestId("onboarding-overlay");
    await expect(onboarding).toBeVisible();
    await expect(onboarding).toHaveAttribute("role", "dialog");
    await expect(onboarding).toHaveAttribute("aria-modal", "true");
    await scan(page, testInfo, "onboarding");

    for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
      await page.getByTestId("onboarding-next").click();
    }
    const starter = page.getByTestId("starter-bloopi");
    await expect(starter).toHaveAttribute("role", "radio");
    await expect(starter).toHaveAttribute("aria-checked", "true");
    await scan(page, testInfo, "starter");
  });

  test("home, dispositivo e backup dopo il primo avvio", async ({ page }, testInfo) => {
    await completeFirstRun(page);
    const timer = page.getByTestId("manual-timer");
    await expect(timer).toHaveAttribute("aria-valuemin", "0");
    await expect(timer).toHaveAttribute("aria-valuenow", "0");
    await expect(timer).toHaveAttribute("aria-valuemax", "120");
    await expect(timer).toHaveAttribute("aria-valuetext", "0:00 di 2:00");
    const zones = page.getByTestId("mouth-zones-progress");
    await expect(zones).toHaveAttribute("aria-valuemin", "0");
    await expect(zones).toHaveAttribute("aria-valuenow", "0");
    await expect(zones).toHaveAttribute("aria-valuemax", "4");
    await scan(page, testInfo, "today");

    await page.getByTestId("tab-device").click();
    await expect(page.getByTestId("device-screen")).toBeVisible();
    await scan(page, testInfo, "device");

    await page.goto("/backup");
    await expect(page.getByTestId("backup-screen")).toBeVisible();
    await scan(page, testInfo, "backup");
  });
});
