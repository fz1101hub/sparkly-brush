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

async function brushOnce(page: Page) {
  await page.goto("/");
  await page.getByTestId("manual-start-stop").click();
  await page.clock.runFor(8_000);
  await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
}

test.describe("messaggio vocale e specchio (lotto 10)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("sul web si ascolta il messaggio del genitore; registrazione e specchio solo nell'app", async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.install({ time: new Date(2026, 9, 27, 7, 30) });
    await completeFirstRun(page);
    await page.goto("/settings");
    await expect(page.getByTestId("media-settings")).toContainText("Un messaggio per");
    await expect(page.getByTestId("voice-app-only")).toBeVisible();
    await expect(page.getByTestId("mirror-setting").locator("input")).toBeDisabled();

    // A message as it arrives from a backup made on the phone.
    await page.evaluate(() => {
      const key = "brushlings.extras.v1";
      const current = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
      const voiceMessage = { audio: "AAAAGGZ0eXBNNEEg", mimeType: "audio/mp4", seconds: 6, recordedAt: Date.now(), repeat: false, heardAt: null };
      localStorage.setItem(key, JSON.stringify({ ...current, voiceMessage }));
    });
    await page.reload();
    await expect(page.getByTestId("voice-message-saved")).toContainText("6 s");
    await expect(page.getByTestId("voice-message-heard")).toContainText("non l’ha ancora ascoltato");

    await brushOnce(page);
    await expect(page.getByTestId("reward-voice-message")).toContainText("C’è un messaggio per te");
    await page.getByTestId("reward-voice-play").click();
    await expect(page.getByTestId("reward-voice-play")).toContainText("Ascolta di nuovo");
    await page.getByTestId("session-reward-dismiss").click();

    await page.goto("/settings");
    await expect(page.getByTestId("voice-message-heard")).toContainText("l’ha ascoltato il");
    // Heard once: the next reward has no message, unless the parent wants it every time.
    await brushOnce(page);
    await expect(page.getByTestId("reward-voice-message")).toHaveCount(0);
    await page.getByTestId("session-reward-dismiss").click();
    await page.goto("/settings");
    await page.getByTestId("voice-repeat").click();
    await expect(page.getByTestId("voice-repeat").locator("input")).toBeChecked();
    await brushOnce(page);
    await expect(page.getByTestId("reward-voice-message")).toBeVisible();
    await page.getByTestId("session-reward-dismiss").click();

    await page.goto("/settings");
    await page.getByTestId("voice-delete").click();
    await expect(page.getByTestId("voice-message-saved")).toHaveCount(0);
  });
});
