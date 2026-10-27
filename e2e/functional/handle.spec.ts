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

async function answerQuestion(page: Page) {
  const question = await page.getByTestId("parent-gate-question").innerText();
  const [first, second] = (question.match(/\d+/g) ?? []).map(Number);
  await page.getByTestId("parent-gate-input").fill(String(first * second));
  await page.getByTestId("parent-gate-confirm").click();
}

test.describe("manico e area genitori", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("il PIN dei genitori sostituisce la moltiplicazione e si recupera se dimenticato", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("parent-pin-input").fill("2468");
    await page.getByTestId("parent-pin-repeat").fill("2469");
    await page.getByTestId("parent-pin-save").click();
    await expect(page.getByTestId("parent-pin-error")).toBeVisible();
    await page.getByTestId("parent-pin-repeat").fill("2468");
    await page.getByTestId("parent-pin-save").click();
    await expect(page.getByTestId("parent-pin-message")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("parent-guard")).toBeVisible();
    await expect(page.getByTestId("parent-gate-question")).toHaveCount(0);
    await page.getByTestId("parent-gate-input").fill("1111");
    await page.getByTestId("parent-gate-confirm").click();
    await expect(page.getByTestId("parent-gate-wrong")).toBeVisible();
    await page.getByTestId("parent-gate-input").fill("2468");
    await page.getByTestId("parent-gate-confirm").click();
    await expect(page.getByTestId("parent-lock-settings")).toBeVisible();

    await page.reload();
    await page.getByTestId("parent-gate-forgot").click();
    await answerQuestion(page);
    await page.getByTestId("parent-pin-remove").click();
    await expect(page.getByTestId("parent-pin-remove")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("parent-gate-question")).toBeVisible();
  });

  test("cura del manico: testina, intensità per età e passaggio a un fratello", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/device");
    await expect(page.getByTestId("device-care")).toBeVisible();
    await expect(page.getByTestId("device-head")).toContainText("Philips");
    await expect(page.getByTestId("device-transfer")).toHaveCount(0);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByTestId("device-head-changed").click();
    await expect(page.getByTestId("device-head")).toContainText("90");

    // A new child opens on the starter choice; the age and the handle settings are theirs.
    await page.goto("/settings");
    await page.getByTestId("profile-new-name").fill("Luca");
    await page.getByTestId("profile-create").click();
    await page.getByTestId("starter-spriggo").click();
    await page.getByTestId("starter-confirm").click();
    await page.goto("/settings");
    await page.getByTestId("age-group-3to6").click();
    await expect(page.getByTestId("age-group-3to6")).toHaveAttribute("aria-checked", "true");

    await page.goto("/device");
    await expect(page.getByTestId("device-head")).toContainText("Philips");
    await expect(page.getByTestId("device-intensity-tip")).toContainText("bassa");
    await expect(page.getByTestId("device-transfer")).toBeVisible();
    // On the web there is no handle to pass on: the choice stays disabled.
    await expect(page.getByTestId("device-transfer-primary")).toBeDisabled();
  });
});
